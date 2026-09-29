import { afterEach, describe, expect, it, vi } from "vitest";

import {
  classifyDatabaseDuration,
  configureDatabaseObservability,
  observeDatabaseConnectionClosed,
  observeDatabaseOperation,
  observeRequest,
  sanitizeDatabaseMessage,
} from "@/lib/db-observability";

function logger() {
  return { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
}

afterEach(() => {
  delete process.env.DB_OBSERVABILITY;
});

configureDatabaseObservability("inst01");

describe("observabilidade do banco", () => {
  it("mantém o retorno de uma operação rápida", async () => {
    const log = logger();
    const result = await observeDatabaseOperation("teste.rapido", async () => 42, { logger: log });
    expect(result).toBe(42);
    expect(log.info).not.toHaveBeenCalled();
  });

  it("propaga o request ID e calcula a duração", async () => {
    process.env.DB_OBSERVABILITY = "1";
    const log = logger();
    const times = [100, 110, 145, 160];
    const now = () => times.shift() ?? 160;
    await observeRequest("/chamados/13", () =>
      observeDatabaseOperation("chamados.buscarPorId", async () => "ok", { logger: log, now }),
    { requestId: "abc123", logger: log, now });
    const output = [...log.info.mock.calls].flat().join("\n");
    expect(output).toContain("req=abc123");
    expect(output).toContain("instance=inst01");
    expect(output).toContain("route=/chamados/13");
    expect(output).toContain("duration=15ms");
    expect(output).toContain("app_queue_wait_ms=35ms");
  });

  it("não engole exceções e sanitiza credenciais", async () => {
    const log = logger();
    const error = Object.assign(new Error("falha postgresql://user:secret@host/db password=secret"), { code: "57014", severity: "ERROR" });
    await expect(observeDatabaseOperation("teste.erro", async () => { throw error; }, { logger: log }))
      .rejects.toBe(error);
    const output = [...log.error.mock.calls].flat().join("\n");
    expect(output).toContain("code=57014");
    expect(output).not.toContain("user:secret");
    expect(output).not.toContain("password=secret");
    expect(output).not.toContain(process.env.DATABASE_URL ?? "valor-inexistente");
  });

  it("classifica os limites progressivos", () => {
    expect(classifyDatabaseDuration(1_000)).toBe("DB");
    expect(classifyDatabaseDuration(1_001)).toBe("DB_SLOW");
    expect(classifyDatabaseDuration(5_001)).toBe("DB_VERY_SLOW");
    expect(classifyDatabaseDuration(30_001)).toBe("DB_STALLED");
  });

  it("remove DATABASE_URL e quebras de linha da mensagem", () => {
    const result = sanitizeDatabaseMessage("DATABASE_URL=postgresql://user:pass@host/db\nfalhou");
    expect(result).toBe("DATABASE_URL=[REMOVED] falhou");
  });

  it("serializa operações de requests diferentes antes do executor PostgreSQL", async () => {
    process.env.DB_OBSERVABILITY = "1";
    const log = logger();
    let liberarPrimeira!: () => void;
    const primeira = new Promise<void>((resolve) => { liberarPrimeira = resolve; });
    const executorB = vi.fn(async () => undefined);
    const operacaoA = observeRequest("/chamados/13", () =>
      observeDatabaseOperation("rats.listarPorChamado", () => primeira, { logger: log }),
    { requestId: "reqA", logger: log });
    await Promise.resolve();
    const operacaoB = observeRequest("/financeiro", () =>
      observeDatabaseOperation("financeiro.listar", executorB, { logger: log }),
    { requestId: "reqB", logger: log });
    await Promise.resolve();
    expect(executorB).not.toHaveBeenCalled();
    liberarPrimeira();
    await Promise.all([operacaoA, operacaoB]);
    expect(executorB).toHaveBeenCalledOnce();
    const output = [...log.info.mock.calls].flat().join("\n");
    expect(output).toContain("[DB_APP_QUEUE_WAIT]");
    expect(output).toContain("occupied_by=rats.listarPorChamado");
    expect(output).toContain("[DB_APP_QUEUE_ACQUIRED]");
    expect(output).not.toContain("active_ops=rats.listarPorChamado,financeiro.listar");
  });

  it("libera a fila quando a operação ocupante falha", async () => {
    let liberarPrimeira!: () => void;
    const primeira = new Promise<void>((resolve) => { liberarPrimeira = resolve; });
    const erro = new Error("falha controlada");
    const executorB = vi.fn(async () => "ok");
    const operacaoA = observeDatabaseOperation("teste.falha", async () => {
      await primeira;
      throw erro;
    });
    await Promise.resolve();
    const operacaoB = observeDatabaseOperation("teste.depois", executorB);
    await Promise.resolve();
    expect(executorB).not.toHaveBeenCalled();
    liberarPrimeira();
    await expect(operacaoA).rejects.toBe(erro);
    await expect(operacaoB).resolves.toBe("ok");
    expect(executorB).toHaveBeenCalledOnce();
  });

  it("processa uma rajada em FIFO com no máximo um executor ativo", async () => {
    let ativos = 0;
    let maximoAtivos = 0;
    const ordemInicio: number[] = [];
    const ordemFim: number[] = [];
    const operacoes = Array.from({ length: 10 }, (_, indice) =>
      observeDatabaseOperation(`rajada.${indice}`, async () => {
        ativos += 1;
        maximoAtivos = Math.max(maximoAtivos, ativos);
        ordemInicio.push(indice);
        await Promise.resolve();
        ordemFim.push(indice);
        ativos -= 1;
        return indice;
      }),
    );
    await expect(Promise.all(operacoes)).resolves.toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(maximoAtivos).toBe(1);
    expect(ordemInicio).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(ordemFim).toEqual(ordemInicio);
  });

  it("mantém toda a unidade transacional no mesmo slot sem readquirir a fila", async () => {
    let liberarTransacao!: () => void;
    const pausa = new Promise<void>((resolve) => { liberarTransacao = resolve; });
    const ordem: string[] = [];
    const transacao = observeDatabaseOperation("transacao.finalizar", async () => {
      ordem.push("select-for-update");
      await pausa;
      ordem.push("update");
      ordem.push("insert-financeiro");
    });
    await Promise.resolve();
    const leitura = observeDatabaseOperation("financeiro.listar", async () => {
      ordem.push("leitura-externa");
    });
    await Promise.resolve();
    expect(ordem).toEqual(["select-for-update"]);
    liberarTransacao();
    await Promise.all([transacao, leitura]);
    expect(ordem).toEqual(["select-for-update", "update", "insert-financeiro", "leitura-externa"]);
  });

  it("não classifica espera na fila como consulta lenta", async () => {
    process.env.DB_OBSERVABILITY = "1";
    const log = logger();
    let liberarPrimeira!: () => void;
    const primeira = new Promise<void>((resolve) => { liberarPrimeira = resolve; });
    const operacaoA = observeDatabaseOperation("ocupante", () => primeira, { logger: log });
    await Promise.resolve();
    const times = [0, 10_000, 10_100];
    const operacaoB = observeDatabaseOperation("aguardando", async () => undefined, {
      logger: log,
      now: () => times.shift() ?? 10_100,
    });
    await Promise.resolve();
    liberarPrimeira();
    await Promise.all([operacaoA, operacaoB]);
    const output = [...log.info.mock.calls].flat().join("\n");
    expect(output).toContain("app_queue_wait_ms=10000ms");
    expect(output).toContain("duration=100ms");
    expect(output).toContain("total_duration=10100ms");
    expect(log.warn).not.toHaveBeenCalledWith(expect.stringContaining("[DB_SLOW]"));
  });

  it("registra fechamento público da conexão sem inferir o motivo", () => {
    process.env.DB_OBSERVABILITY = "1";
    const log = logger();
    observeDatabaseConnectionClosed(7, log);
    const output = [...log.warn.mock.calls].flat().join("\n");
    expect(output).toContain("[DB_CONNECTION_CLOSED]");
    expect(output).toContain("instance=inst01");
    expect(output).toContain("connection=7");
    expect(output).toContain("reason=not_exposed_by_public_onclose");
  });
});
