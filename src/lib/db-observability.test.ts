import { afterEach, describe, expect, it, vi } from "vitest";

import {
  classifyDatabaseDuration,
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
    expect(output).toContain("route=/chamados/13");
    expect(output).toContain("duration=35ms");
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
});
