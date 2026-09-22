import { describe, expect, it } from "vitest";

import { filtrarChamados } from "@/lib/chamados-filter";
import { ordenarChamados } from "@/lib/chamados-order";
import { resolverValorCardChamado } from "@/lib/chamados-valor";
import type { ChamadoResumo } from "@/lib/types";

function valor(
  valor_financeiro: string | null,
  dados: Partial<Parameters<typeof resolverValorCardChamado>[0]> = {},
) {
  return resolverValorCardChamado({
    cliente: "Claro",
    status: "Concluído",
    valor_base: "100.00",
    valor_financeiro,
    ...dados,
  });
}

function chamado(id: number, valor_card: string): ChamadoResumo {
  return {
    id,
    numero_chamado: id === 20 ? "SR-855635" : `MI-${id}`,
    status: "Concluído",
    data_agendada: "2026-09-15",
    hora_agendada: "09:00",
    cliente: id === 20 ? "DASA" : "Claro",
    projeto: "",
    cidade: "Curitiba",
    estado: "PR",
    atividade: "Field Services",
    valor_base: "100.00",
    valor_financeiro: valor_card,
    valor_card,
    pendencia_financeira: false,
    visualizado_em: "2026-09-15T12:00:00.000Z",
  };
}

describe("valor financeiro nos cards de chamados", () => {
  it.each(["100.00", "130.00", "160.00"])(
    "prioriza valor_total do recebível: %s",
    (valorTotal) => {
      expect(valor(valorTotal)).toEqual({
        valor_card: valorTotal,
        pendencia_financeira: false,
      });
    },
  );

  it("usa os R$ 130 do recebível DASA equivalente ao SR-855635", () => {
    expect(valor("130.00", { cliente: "DASA" }).valor_card).toBe("130.00");
  });

  it("ignora valor_recebido e mantém valor_total como fonte do card", () => {
    const recebido = {
      cliente: "Claro",
      status: "Concluído",
      valor_base: "100.00",
      valor_financeiro: "130.00",
      valor_recebido: "125.00",
    };
    expect(resolverValorCardChamado(recebido).valor_card).toBe("130.00");
  });

  it("mantém o valor-base para chamado agendado sem recebível", () => {
    expect(valor(null, { status: "Agendado" })).toEqual({
      valor_card: "100.00",
      pendencia_financeira: false,
    });
  });

  it("usa o valor da política quando o agendado não tem valor_base", () => {
    expect(valor(null, { status: "Agendado", cliente: "DASA", valor_base: null })).toEqual({
      valor_card: "100.00",
      pendencia_financeira: false,
    });
  });

  it("não inventa valor para encerrado sem recebível", () => {
    expect(valor(null)).toEqual({ valor_card: null, pendencia_financeira: true });
  });

  it("preserva valor e ordem ao filtrar", () => {
    const ordenados = ordenarChamados([
      { ...chamado(20, "130.00"), encerrado_em: "2026-09-15T12:00:00.000Z" },
      { ...chamado(21, "160.00"), encerrado_em: "2026-09-21T12:00:00.000Z" },
    ]);
    const filtrados = filtrarChamados(ordenados, "dasa", "Todos");
    expect(filtrados.map((item) => [item.id, item.valor_card])).toEqual([[20, "130.00"]]);
  });
});
