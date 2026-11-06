import { describe, expect, it } from "vitest";

import { calcularFinanceiro } from "@/lib/financeiro-calculo";

describe("calcularFinanceiro", () => {
  it.each([
    ["09:00", "12:00", 180, 0, 100],
    ["09:00", "12:01", 181, 1, 130],
    ["09:00", "13:00", 240, 1, 130],
    ["09:00", "13:01", 241, 2, 160],
    ["09:00", "14:00", 300, 2, 160],
    ["09:00", "14:01", 301, 3, 190],
  ])("calcula %s até %s", (inicio, fim, duracao, adicionais, total) => {
    expect(calcularFinanceiro(inicio, fim)).toMatchObject({
      duracao_minutos: duracao,
      horas_adicionais: adicionais,
      valor_total: total,
      regra_preco: "BASE_100_3H_ADICIONAL_30_V1",
    });
  });

  it.each([["", "12:00"], ["09:00", ""], ["25:00", "12:00"], ["23:00", "01:00"]])(
    "mantém pendente quando o intervalo %s–%s não é seguro",
    (inicio, fim) => expect(calcularFinanceiro(inicio, fim)).toBeNull(),
  );

  it.each([
    ["09:00", "11:00", 120, 0, 120],
    ["09:00", "11:01", 121, 1, 170],
    ["09:00", "12:00", 180, 1, 170],
    ["09:00", "12:01", 181, 2, 220],
    ["09:00", "12:20", 200, 2, 220],
  ])("calcula São José de %s até %s", (inicio, fim, duracao, adicionais, total) => {
    expect(calcularFinanceiro(inicio, fim, {
      valor_base: "120",
      horas_incluidas: "2",
      valor_hora_adicional: "50",
    })).toEqual({
      duracao_minutos: duracao,
      horas_adicionais: adicionais,
      valor_base: 120,
      valor_hora_adicional: 50,
      valor_adicional: adicionais * 50,
      valor_total: total,
      regra_preco: "PARAMETROS_CHAMADO_V1",
    });
  });

  it("preserva parâmetros zero e cobra sem substituir pelos padrões", () => {
    expect(calcularFinanceiro("09:00", "09:01", {
      valor_base: 0,
      horas_incluidas: 0,
      valor_hora_adicional: 0,
    })).toMatchObject({
      horas_adicionais: 1,
      valor_base: 0,
      valor_hora_adicional: 0,
      valor_total: 0,
      regra_preco: "PARAMETROS_CHAMADO_V1",
    });
  });
});
