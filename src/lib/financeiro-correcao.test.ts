import { describe, expect, it } from "vitest";

import { aplicarCorrecaoFinanceiraSchema, parametrosCorrecaoFinanceiraSchema } from "@/lib/financeiro-correcao";

describe("validação da correção financeira", () => {
  it("aceita parâmetros não negativos e preserva zero explícito", () => {
    expect(parametrosCorrecaoFinanceiraSchema.parse({
      valor_base: "0", horas_incluidas: "0", valor_hora_adicional: "0",
    })).toEqual({ valor_base: 0, horas_incluidas: 0, valor_hora_adicional: 0 });
  });

  it("rejeita negativos, motivo ausente e confirmação implícita", () => {
    expect(() => parametrosCorrecaoFinanceiraSchema.parse({
      valor_base: -1, horas_incluidas: 3, valor_hora_adicional: 30,
    })).toThrow();
    expect(() => aplicarCorrecaoFinanceiraSchema.parse({
      parametros: { valor_base: 130, horas_incluidas: 3, valor_hora_adicional: 30 },
      motivo: "", confirmado: false, versao: "a".repeat(64),
    })).toThrow();
  });
});
