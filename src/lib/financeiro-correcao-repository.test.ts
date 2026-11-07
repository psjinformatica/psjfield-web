import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ getSql: vi.fn() }));
vi.mock("@/lib/db-observability", () => ({ observeDatabaseOperation: (_n: string, op: () => unknown) => op() }));

import { getSql } from "@/lib/db";
import { aplicarCorrecaoFinanceira, prepararCorrecaoFinanceira } from "@/lib/financeiro-correcao-repository";

const CONTA = "f8773c4e-680f-4ad0-9c54-f76f14756975";
const linha = (sobrescrever: Record<string, unknown> = {}) => ({
  conta_id: CONTA, chamado_id: 29, numero_chamado: "INC-1029806", cliente: "DASA",
  status_chamado: "Concluído", valor_base_chamado: null, horas_incluidas_chamado: null,
  valor_hora_adicional_chamado: null, atualizado_em_chamado: new Date("2026-11-04T18:55:00Z"),
  encerrado_em: new Date("2026-11-04T18:55:00Z"), hora_inicio_snapshot: "15:40",
  hora_fim_snapshot: "15:55", duracao_minutos: 15, horas_adicionais: 0, valor_base: "100.00",
  valor_hora_adicional: "30.00", valor_adicional: "0.00", valor_total: "100.00",
  regra_preco: "BASE_100_3H_ADICIONAL_30_V1", origem: "AUTOMATICO", prazo_dias: 41,
  previsao_recebimento: "2026-12-15", situacao: "A_RECEBER", revisao_pendente: false,
  recebido_em: null, valor_recebido: null, atualizado_em_conta: new Date("2026-11-04T18:55:00Z"),
  ...sobrescrever,
});

function banco(registro = linha(), falharAuditoria = false) {
  const consultas: Array<{ sql: string; valores: unknown[] }> = [];
  const tx = Object.assign((strings: TemplateStringsArray, ...valores: unknown[]) => {
    const sql = strings.join("?");
    consultas.push({ sql, valores });
    if (sql.includes("SELECT cr.id")) return Promise.resolve([registro]);
    if (sql.includes("UPDATE contas_receber")) return Promise.resolve([{ id: CONTA }]);
    if (sql.includes("INSERT INTO chamados_alteracoes") && falharAuditoria) return Promise.reject(new Error("falha de auditoria"));
    return Promise.resolve([]);
  }, { json: (valor: unknown) => valor });
  const sql = Object.assign((strings: TemplateStringsArray, ...valores: unknown[]) => tx(strings, ...valores), {
    begin: (op: (t: typeof tx) => unknown) => op(tx),
  });
  vi.mocked(getSql).mockReturnValue(sql as never);
  return consultas;
}

describe("correção financeira transacional", () => {
  beforeEach(() => vi.clearAllMocks());

  it("calcula no servidor o caso INC-1029806 e preserva a previsão", async () => {
    banco();
    const previa = await prepararCorrecaoFinanceira(CONTA, {
      valor_base: 130, horas_incluidas: 3, valor_hora_adicional: 30,
    });
    expect(previa).toMatchObject({ chamado_id: 29, previsao_recebimento: "2026-12-15", duracao_minutos: 15 });
    expect(previa.atual.valor_total).toBe(100);
    expect(previa.novo).toMatchObject({ valor_base: 130, valor_total: 130, horas_adicionais: 0, regra_preco: "PARAMETROS_CHAMADO_V1" });
  });

  it("trava chamado e conta, atualiza somente campos financeiros e audita na mesma transação", async () => {
    const consultas = banco();
    const previa = await prepararCorrecaoFinanceira(CONTA, { valor_base: 130, horas_incluidas: 3, valor_hora_adicional: 30 });
    await aplicarCorrecaoFinanceira(CONTA, { valor_base: 130, horas_incluidas: 3, valor_hora_adicional: 30 }, "Ajuste comercial autorizado", previa.versao);

    expect(consultas.find((q) => q.sql.includes("FOR UPDATE"))?.sql).toContain("FOR UPDATE OF cr, c");
    const chamado = consultas.find((q) => q.sql.includes("UPDATE chamados"));
    expect(chamado?.sql).not.toContain("atualizado_em");
    expect(chamado?.valores).toContain(29);
    const conta = consultas.find((q) => q.sql.includes("UPDATE contas_receber"));
    expect(conta?.sql).toContain("situacao = 'A_RECEBER'");
    expect(conta?.sql).not.toMatch(/(?:previsao|prazo_dias|origem|encerrado_em|hora_inicio_snapshot)\s*=/);
    expect(consultas.some((q) => q.sql.includes("INSERT INTO chamados_alteracoes"))).toBe(true);
    expect(consultas.some((q) => q.sql.includes("INSERT INTO contas_receber"))).toBe(false);
    expect(consultas.every((q) => !/(?:INSERT INTO|UPDATE|DELETE FROM)\s+(?:rats|storage)/i.test(q.sql))).toBe(true);
  });

  it.each([
    { situacao: "RECEBIDO" },
    { situacao: "EM_REVISAO", revisao_pendente: true },
  ])("rejeita recebível inelegível %#", async (estado) => {
    banco(linha(estado));
    await expect(prepararCorrecaoFinanceira(CONTA, { valor_base: 130, horas_incluidas: 3, valor_hora_adicional: 30 }))
      .rejects.toThrow("somente para recebíveis A_RECEBER");
  });

  it("rejeita versão concorrente e não escreve", async () => {
    const consultas = banco();
    await expect(aplicarCorrecaoFinanceira(CONTA, { valor_base: 130, horas_incluidas: 3, valor_hora_adicional: 30 }, "Motivo", "0".repeat(64)))
      .rejects.toThrow("alterado em outra tela");
    expect(consultas.some((q) => /^\s*UPDATE\s/m.test(q.sql))).toBe(false);
  });

  it("propaga falha de auditoria para rollback da transação", async () => {
    banco(undefined, true);
    const previa = await prepararCorrecaoFinanceira(CONTA, { valor_base: 130, horas_incluidas: 3, valor_hora_adicional: 30 });
    await expect(aplicarCorrecaoFinanceira(CONTA, { valor_base: 130, horas_incluidas: 3, valor_hora_adicional: 30 }, "Motivo válido", previa.versao))
      .rejects.toThrow("falha de auditoria");
  });
});
