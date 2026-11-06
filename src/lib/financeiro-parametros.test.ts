import { describe, expect, it } from "vitest";

import {
  PARAMETROS_FINANCEIROS_PADRAO,
  resolverParametrosFinanceiros,
} from "@/lib/financeiro-parametros";

describe("parâmetros financeiros do chamado", () => {
  it("aplica os padrões quando os campos estão ausentes", () => {
    expect(resolverParametrosFinanceiros({
      valor_base: null,
      horas_incluidas: null,
      valor_hora_adicional: null,
    })).toEqual({
      ...PARAMETROS_FINANCEIROS_PADRAO,
      regra_preco: "BASE_100_3H_ADICIONAL_30_V1",
      personalizado: false,
    });
  });

  it("resolve cada parâmetro individualmente e identifica personalização", () => {
    expect(resolverParametrosFinanceiros({ valor_base: "120", horas_incluidas: null, valor_hora_adicional: "50" }))
      .toEqual({
        valor_base: 120,
        horas_incluidas: 3,
        valor_hora_adicional: 50,
        regra_preco: "PARAMETROS_CHAMADO_V1",
        personalizado: true,
      });
  });

  it("preserva zeros explicitamente informados", () => {
    expect(resolverParametrosFinanceiros({ valor_base: "0", horas_incluidas: 0, valor_hora_adicional: "0" }))
      .toEqual({
        valor_base: 0,
        horas_incluidas: 0,
        valor_hora_adicional: 0,
        regra_preco: "PARAMETROS_CHAMADO_V1",
        personalizado: true,
      });
  });

  it("não mascara valor persistido inválido com o padrão", () => {
    expect(() => resolverParametrosFinanceiros({ horas_incluidas: "inválido" }))
      .toThrow("Parâmetro financeiro inválido: horas_incluidas");
  });
});
