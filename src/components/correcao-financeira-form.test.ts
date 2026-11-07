import { describe, expect, it, vi } from "vitest";

import {
  podeCorrigirParametrosFinanceiros,
  solicitarCorrecaoFinanceira,
  solicitarPreviaCorrecaoFinanceira,
} from "@/components/correcao-financeira-form";

describe("ação de correção financeira", () => {
  it.each([
    ["A_RECEBER", false, "100.00", true],
    ["A_RECEBER", true, "100.00", false],
    ["RECEBIDO", false, "100.00", false],
    ["EM_REVISAO", true, "100.00", false],
  ] as const)("controla elegibilidade %s/revisão %s", (situacao, revisao_pendente, valor_total, esperado) => {
    expect(podeCorrigirParametrosFinanceiros({ situacao, revisao_pendente, valor_total })).toBe(esperado);
  });

  it("solicita cálculo no servidor e nunca envia total calculado pelo navegador", async () => {
    const solicitar = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ versao: "a".repeat(64) }) });
    await solicitarPreviaCorrecaoFinanceira("conta", { valor_base: "130", horas_incluidas: "3", valor_hora_adicional: "30" }, solicitar);
    const corpo = JSON.parse(solicitar.mock.calls[0][1].body);
    expect(corpo).toEqual({ parametros: { valor_base: "130", horas_incluidas: "3", valor_hora_adicional: "30" } });
    expect(corpo.valor_total).toBeUndefined();
  });

  it("envia confirmação explícita, motivo e token da prévia", async () => {
    const solicitar = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ ok: true }) });
    await solicitarCorrecaoFinanceira("conta", { versao: "a".repeat(64) } as never, {
      valor_base: "130", horas_incluidas: "3", valor_hora_adicional: "30",
    }, "Ajuste comercial", solicitar);
    const corpo = JSON.parse(solicitar.mock.calls[0][1].body);
    expect(corpo).toMatchObject({ confirmado: true, motivo: "Ajuste comercial", versao: "a".repeat(64) });
  });
});
