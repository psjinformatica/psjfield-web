import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ getSql: vi.fn() }));
vi.mock("@/lib/db-observability", () => ({
  observeDatabaseOperation: (_nome: string, operacao: () => unknown) => operacao(),
}));

import { getSql } from "@/lib/db";
import {
  listarContasReceber,
  registrarContaAutomatica,
  repararContaAutomaticaAusente,
  reverterContaRecebida,
} from "@/lib/financeiro-repository";

type ConsultaCapturada = { sql: string; valores: unknown[] };

function transacaoCapturada() {
  const consultas: ConsultaCapturada[] = [];
  const transacao = (strings: TemplateStringsArray, ...valores: unknown[]) => {
    consultas.push({ sql: strings.join("?"), valores });
    return Promise.resolve([]);
  };
  return { consultas, transacao: transacao as never };
}

function bancoReparo(opcoes: { existente?: boolean } = {}) {
  const consultas: ConsultaCapturada[] = [];
  const transacao = (strings: TemplateStringsArray, ...valores: unknown[]) => {
    const sql = strings.join("?");
    consultas.push({ sql, valores });
    if (sql.includes("FROM chamados")) {
      return Promise.resolve([{
        id: 24,
        numero_chamado: "SR-906366",
        cliente: "DASA Chamado para atendimento",
        status: "Improdutivo",
        hora_inicio: "15:00",
        hora_termino: "15:10",
        atualizado_em: new Date("2026-09-28T18:10:00.000Z"),
      }]);
    }
    if (sql.includes("SELECT id FROM contas_receber")) {
      return Promise.resolve(opcoes.existente ? [{ id: "recebivel-visita-1" }] : []);
    }
    if (sql.includes("INSERT INTO contas_receber")) {
      return Promise.resolve([{ id: "recebivel-visita-1" }]);
    }
    return Promise.resolve([]);
  };
  vi.mocked(getSql).mockReturnValue({
    begin: (operacao: (tx: typeof transacao) => unknown) => operacao(transacao),
  } as never);
  return consultas;
}

describe("registrarContaAutomatica", () => {
  beforeEach(() => vi.clearAllMocks());

  it.each(["Concluído", "Improdutivo"])(
    "prepara um único upsert DASA para encerramento %s",
    async () => {
      const captura = transacaoCapturada();
      const criado = await registrarContaAutomatica(captura.transacao, {
        id: 24,
        numero_chamado: "SR-TESTE",
        cliente: "DASA",
        hora_inicio: "09:00",
        hora_termino: "12:20",
      }, "2026-09-15T18:00:00.000Z");

      expect(criado).toBe(true);
      expect(captura.consultas).toHaveLength(1);
      expect(captura.consultas[0].sql).toContain("INSERT INTO contas_receber");
      expect(captura.consultas[0].sql).toContain("'AUTOMATICO'");
      expect(captura.consultas[0].sql).toContain("ON CONFLICT (chamado_id) DO UPDATE");
      expect(captura.consultas[0].valores).toEqual([
        24, "SR-TESTE", "2026-09-15T18:00:00.000Z", "09:00", "12:20",
        200, 1, 100, 30, 30, 130, "BASE_100_3H_ADICIONAL_30_V1", 30,
        "A_RECEBER", false,
      ]);
    },
  );

  it("encaminha DASA com horários incompletos para revisão sem inventar cálculo", async () => {
    const captura = transacaoCapturada();
    await expect(registrarContaAutomatica(captura.transacao, {
      id: 25,
      numero_chamado: "SR-REVISAO",
      cliente: "DASA",
      hora_inicio: "",
      hora_termino: "12:20",
    }, "2026-09-15T18:00:00.000Z")).resolves.toBe(true);

    expect(captura.consultas[0].valores).toEqual([
      25, "SR-REVISAO", "2026-09-15T18:00:00.000Z", "", "12:20",
      null, null, 100, 30, null, null, "BASE_100_3H_ADICIONAL_30_V1", 30,
      "EM_REVISAO", true,
    ]);
  });

  it("preserva INC no snapshot financeiro sem depender de prefixo MI ou SR", async () => {
    const captura = transacaoCapturada();
    await registrarContaAutomatica(captura.transacao, {
      id: 26,
      numero_chamado: "INC-924376",
      cliente: "DASA",
      hora_inicio: "09:00",
      hora_termino: "09:30",
    }, "2026-10-01T12:30:00.000Z");

    expect(captura.consultas[0].valores[1]).toBe("INC-924376");
  });

  it("não cria recebível para cliente sem política financeira", async () => {
    const captura = transacaoCapturada();
    await expect(registrarContaAutomatica(captura.transacao, {
      id: 26,
      numero_chamado: "OUTRO-1",
      cliente: "Cliente desconhecido",
      hora_inicio: "09:00",
      hora_termino: "12:20",
    }, "2026-09-15T18:00:00.000Z")).resolves.toBe(false);
    expect(captura.consultas).toHaveLength(0);
  });

  it("preserva conteúdo financeiro e previsão de recebível já pago no upsert", async () => {
    const captura = transacaoCapturada();
    await registrarContaAutomatica(captura.transacao, {
      id: 27,
      numero_chamado: "SR-PAGO",
      cliente: "DASA",
      hora_inicio: "09:00",
      hora_termino: "12:20",
    }, "2026-09-15T18:00:00.000Z");

    const sql = captura.consultas[0].sql;
    expect(sql).toContain("contas_receber.situacao = 'RECEBIDO'");
    expect(sql).toContain("THEN contas_receber.valor_total ELSE EXCLUDED.valor_total END");
    expect(sql).toContain("THEN contas_receber.prazo_dias ELSE EXCLUDED.prazo_dias END");
    expect(sql).toContain("THEN 'RECEBIDO' ELSE EXCLUDED.situacao END");
  });
});

describe("repararContaAutomaticaAusente", () => {
  beforeEach(() => vi.clearAllMocks());

  it("reconstrói a Visita 1 pela política DASA atual sem valores financeiros hardcoded", async () => {
    const consultas = bancoReparo();

    await expect(repararContaAutomaticaAusente(24)).resolves.toEqual({
      criado: true,
      recebivel_id: "recebivel-visita-1",
      chamado_id: 24,
      previsao_recebimento: "2026-10-15",
      duracao_minutos: 10,
      valor_total: 100,
      regra_preco: "BASE_100_3H_ADICIONAL_30_V1",
    });

    const insercao = consultas.find((consulta) => consulta.sql.includes("INSERT INTO contas_receber"));
    expect(insercao?.sql).toContain("ON CONFLICT (chamado_id) DO NOTHING");
    expect(insercao?.sql).toContain("'AUTOMATICO'");
    expect(insercao?.sql).toContain("'A_RECEBER'");
    expect(insercao?.valores).toEqual([
      24,
      "SR-906366",
      "2026-09-28T18:10:00.000Z",
      "15:00",
      "15:10",
      10,
      0,
      100,
      30,
      0,
      100,
      "BASE_100_3H_ADICIONAL_30_V1",
      17,
    ]);
  });

  it("é idempotente e não escreve quando o recebível já existe", async () => {
    const consultas = bancoReparo({ existente: true });

    await expect(repararContaAutomaticaAusente(24)).resolves.toMatchObject({
      criado: false,
      recebivel_id: "recebivel-visita-1",
      chamado_id: 24,
    });
    expect(consultas.some((consulta) => consulta.sql.includes("INSERT INTO contas_receber"))).toBe(false);
  });

  it("trava e escreve somente a Visita 1, sem atualizar a Visita 2", async () => {
    const consultas = bancoReparo();

    await repararContaAutomaticaAusente(24);

    expect(consultas[0].sql).toContain("FOR UPDATE");
    expect(consultas.every((consulta) => !consulta.sql.includes("UPDATE "))).toBe(true);
    expect(consultas.every((consulta) => !consulta.valores.includes(25))).toBe(true);
  });
});

describe("reverterContaRecebida", () => {
  beforeEach(() => vi.clearAllMocks());

  it("limpa somente os dados do recebimento e preserva atendimento, RAT e snapshots", async () => {
    const consultas: ConsultaCapturada[] = [];
    const sql = (strings: TemplateStringsArray, ...valores: unknown[]) => {
      consultas.push({ sql: strings.join("?"), valores });
      return Promise.resolve([{ id: "8e84b693-e79d-41b5-9e27-ce087109bd18" }]);
    };
    vi.mocked(getSql).mockReturnValue(sql as never);

    await reverterContaRecebida("8e84b693-e79d-41b5-9e27-ce087109bd18");

    expect(consultas).toHaveLength(1);
    expect(consultas[0].sql).toContain("UPDATE contas_receber");
    expect(consultas[0].sql).toContain("situacao = CASE WHEN revisao_pendente THEN 'EM_REVISAO' ELSE 'A_RECEBER' END");
    expect(consultas[0].sql).toContain("recebido_em = NULL");
    expect(consultas[0].sql).toContain("valor_recebido = NULL");
    expect(consultas[0].sql).toContain("situacao = 'RECEBIDO'");
    expect(consultas[0].sql).not.toMatch(/(?:UPDATE|INSERT INTO|DELETE FROM)\s+(?:chamados|rats)/);
    for (const campo of [
      "encerrado_em", "hora_inicio_snapshot", "hora_fim_snapshot", "duracao_minutos",
      "valor_base", "valor_adicional", "valor_total", "previsao_recebimento",
    ]) {
      expect(consultas[0].sql).not.toContain(`${campo} =`);
    }
  });

  it("não aceita reverter uma conta que já não está recebida", async () => {
    vi.mocked(getSql).mockReturnValue((() => Promise.resolve([])) as never);
    await expect(reverterContaRecebida("8e84b693-e79d-41b5-9e27-ce087109bd18"))
      .rejects.toThrow("Conta não encontrada ou não está recebida");
  });

  it("reutiliza a regra vigente da listagem para previsão atingida ou a receber", async () => {
    const consultas: ConsultaCapturada[] = [];
    vi.mocked(getSql).mockReturnValue(((strings: TemplateStringsArray, ...valores: unknown[]) => {
      consultas.push({ sql: strings.join("?"), valores });
      return Promise.resolve([]);
    }) as never);

    await listarContasReceber();

    expect(consultas[0].sql).toContain("WHEN cr.situacao = 'EM_REVISAO' THEN 'Em revisão'");
    expect(consultas[0].sql).toMatch(/<= \(NOW\(\) AT TIME ZONE 'America\/Sao_Paulo'\)::date THEN 'Previsão atingida'/);
    expect(consultas[0].sql).toContain("ELSE 'A receber'");
  });
});
