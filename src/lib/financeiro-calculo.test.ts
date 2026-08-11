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
});
