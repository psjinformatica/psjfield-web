import { describe, expect, it } from "vitest";

import {
  calcularPrevisaoRecebimento,
  calcularPrazoAtePrevisao,
  calcularValorAtendimento,
  prepararRecebivelAutomatico,
  resolverPoliticaFinanceira,
} from "@/lib/financeiro-politicas";

describe("políticas financeiras por cliente", () => {
  it.each([
    ["2026-01-25", "2026-02-15"],
    ["2026-01-26", "2026-03-15"],
    ["2026-02-25", "2026-03-15"],
    ["2026-02-26", "2026-04-15"],
    ["2026-03-25", "2026-04-15"],
    ["2026-03-26", "2026-05-15"],
    ["2026-12-25", "2027-01-15"],
    ["2026-12-26", "2027-02-15"],
    ["2027-02-28", "2027-04-15"],
    ["2028-02-29", "2028-04-15"],
  ])("aplica o ciclo Claro em %s", (encerramento, previsao) => {
    expect(calcularPrevisaoRecebimento("Claro", encerramento)).toBe(previsao);
  });

  it.each([
    ["2026-09-01", "2026-10-15"],
    ["2026-09-15", "2026-10-15"],
    ["2026-09-30", "2026-10-15"],
    ["2026-10-01", "2026-11-15"],
    ["2026-12-31", "2027-01-15"],
    ["2027-02-28", "2027-03-15"],
    ["2028-02-29", "2028-03-15"],
  ])("aplica o ciclo DASA em %s", (encerramento, previsao) => {
    expect(calcularPrevisaoRecebimento("  DÁSÁ S.A. ", encerramento)).toBe(previsao);
  });

  it("usa a data civil de São Paulo para um instante de encerramento", () => {
    expect(calcularPrevisaoRecebimento("Claro", "2026-02-26T02:30:00.000Z")).toBe("2026-03-15");
    expect(calcularPrevisaoRecebimento("Claro", "2026-02-26T03:30:00.000Z")).toBe("2026-04-15");
  });

  it("combina a previsão DASA com a política de preço compartilhada", () => {
    expect(resolverPoliticaFinanceira("DASA")).toMatchObject({
      regra_previsao: "MES_CALENDARIO_DIA_15",
      regra_valor: "BASE_100_3H_ADICIONAL_30_V1",
    });
    expect(calcularPrevisaoRecebimento("DASA", "2026-09-15")).toBe("2026-10-15");
    expect(calcularValorAtendimento("DASA", "09:00", "12:20")).toMatchObject({
      valor_total: 130,
      regra_preco: "BASE_100_3H_ADICIONAL_30_V1",
    });
    expect(prepararRecebivelAutomatico("DASA", "2026-09-15", "09:00", "12:20")).toMatchObject({
      previsao_recebimento: "2026-10-15",
      prazo_dias: 30,
      calculo: { valor_total: 130, regra_preco: "BASE_100_3H_ADICIONAL_30_V1" },
    });
  });

  it.each(["Claro", "DASA"])("aplica a política de preço compartilhada para %s", (cliente) => {
    for (const [inicio, fim, duracao, adicionais, total] of [
      ["09:00", "09:10", 10, 0, 100],
      ["09:00", "12:00", 180, 0, 100],
      ["09:00", "12:01", 181, 1, 130],
      ["09:00", "13:00", 240, 1, 130],
      ["09:00", "13:01", 241, 2, 160],
      ["09:00", "14:00", 300, 2, 160],
      ["09:00", "14:01", 301, 3, 190],
    ] as const) {
      expect(calcularValorAtendimento(cliente, inicio, fim)).toMatchObject({
        duracao_minutos: duracao,
        horas_adicionais: adicionais,
        valor_total: total,
        regra_preco: "BASE_100_3H_ADICIONAL_30_V1",
      });
    }
  });

  it("mantém a regra de valor atual somente para aliases Claro", () => {
    expect(calcularValorAtendimento(" claro brasil s/a ", "09:00", "12:20")).toMatchObject({
      valor_total: 130,
    });
    expect(calcularValorAtendimento("Cliente desconhecido", "09:00", "12:20")).toBeNull();
    expect(calcularPrevisaoRecebimento("Cliente desconhecido", "2026-09-15")).toBeNull();
    expect(prepararRecebivelAutomatico("Claro", "2026-09-15", "09:00", "12:20")).toMatchObject({
      previsao_recebimento: "2026-10-15",
      prazo_dias: 30,
      calculo: { valor_total: 130 },
    });
    expect(prepararRecebivelAutomatico("Claro", "2026-09-15", "", "12:20")).toMatchObject({
      previsao_recebimento: "2026-10-15",
      calculo: null,
    });
  });

  it("calcula o prazo persistido sem depender do fuso horário", () => {
    expect(calcularPrazoAtePrevisao("2026-02-25T18:00:00.000Z", "2026-03-15")).toBe(18);
    expect(calcularPrazoAtePrevisao("2028-02-29", "2028-04-15")).toBe(46);
  });

  it("rejeita datas inválidas", () => {
    expect(calcularPrevisaoRecebimento("Claro", "2026-02-29")).toBeNull();
    expect(calcularPrazoAtePrevisao("inválida", "2026-03-15")).toBeNull();
  });
});
