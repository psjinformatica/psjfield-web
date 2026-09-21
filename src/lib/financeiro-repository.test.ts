import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ getSql: vi.fn() }));
vi.mock("@/lib/db-observability", () => ({
  observeDatabaseOperation: (_nome: string, operacao: () => unknown) => operacao(),
}));

import { registrarContaAutomatica } from "@/lib/financeiro-repository";

type ConsultaCapturada = { sql: string; valores: unknown[] };

function transacaoCapturada() {
  const consultas: ConsultaCapturada[] = [];
  const transacao = (strings: TemplateStringsArray, ...valores: unknown[]) => {
    consultas.push({ sql: strings.join("?"), valores });
    return Promise.resolve([]);
  };
  return { consultas, transacao: transacao as never };
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
