import { describe, expect, it } from "vitest";

import {
  filtrarContasFinanceiro,
  indicadoresContaFinanceiro,
} from "@/components/financeiro-lista";
import type { ContaReceber } from "@/lib/financeiro-types";

function conta(situacao: ContaReceber["situacao"], id = "conta-1"): ContaReceber {
  return {
    id,
    chamado_id: 1,
    numero_chamado: "MI-100",
    encerrado_em: "2026-09-10T15:00:00.000Z",
    hora_inicio_snapshot: "09:00",
    hora_fim_snapshot: "12:20",
    duracao_minutos: 200,
    horas_adicionais: 1,
    valor_base: "100.00",
    valor_hora_adicional: "30.00",
    valor_adicional: "30.00",
    valor_total: "130.00",
    regra_preco: "BASE_100_3H_ADICIONAL_30_V1",
    origem: "AUTOMATICO",
    prazo_dias: 35,
    previsao_recebimento: "2026-10-15",
    situacao,
    rotulo_situacao: situacao === "RECEBIDO" ? "Recebido" : "A receber",
    revisao_pendente: false,
    recebido_em: situacao === "RECEBIDO" ? "2026-10-14" : null,
    valor_recebido: situacao === "RECEBIDO" ? "130.00" : null,
    observacoes: "",
  };
}

describe("indicadores dos cards financeiros", () => {
  it("mostra previsão enquanto o recebível está pendente", () => {
    expect(indicadoresContaFinanceiro(conta("A_RECEBER"))).toEqual([
      { rotulo: "Valor", valor: "R$ 130,00" },
      { rotulo: "Previsão", valor: "15/10/2026" },
      { rotulo: "Duração", valor: "3h20" },
      { rotulo: "Origem", valor: "Automático" },
    ]);
  });

  it("mostra a data real, sem apagar a previsão, quando recebido", () => {
    const recebida = conta("RECEBIDO");
    recebida.valor_recebido = "125.50";
    expect(indicadoresContaFinanceiro(recebida)).toEqual([
      { rotulo: "Valor", valor: "R$ 125,50" },
      { rotulo: "Recebido em", valor: "14/10/2026" },
      { rotulo: "Duração", valor: "3h20" },
      { rotulo: "Origem", valor: "Automático" },
    ]);
    expect(recebida.previsao_recebimento).toBe("2026-10-15");
    expect(recebida.valor_recebido).toBe("125.50");
  });

  it("preserva a ordem original ao aplicar todos os filtros", () => {
    const contas = [conta("A_RECEBER", "1"), conta("RECEBIDO", "2"), conta("EM_REVISAO", "3")];
    expect(filtrarContasFinanceiro(contas, "TODOS").map(({ id }) => id)).toEqual(["1", "2", "3"]);
    expect(filtrarContasFinanceiro(contas, "A_RECEBER").map(({ id }) => id)).toEqual(["1"]);
    expect(filtrarContasFinanceiro(contas, "RECEBIDO").map(({ id }) => id)).toEqual(["2"]);
    expect(filtrarContasFinanceiro(contas, "EM_REVISAO").map(({ id }) => id)).toEqual(["3"]);
  });
});
