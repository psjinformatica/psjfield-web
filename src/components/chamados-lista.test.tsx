import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ChamadosLista } from "@/components/chamados-lista";
import type { ChamadoResumo } from "@/lib/types";

function chamado(
  visualizado_em: string | null,
  dados: Partial<ChamadoResumo> = {},
): ChamadoResumo {
  return {
    id: 20,
    numero_chamado: "SR-855635",
    status: "Agendado",
    data_agendada: "2026-09-15",
    hora_agendada: "09:00",
    cliente: "DASA",
    projeto: "",
    cidade: "São Paulo",
    estado: "SP",
    atividade: "Field Services",
    valor_base: "100.00",
    valor_financeiro: null,
    valor_card: "100.00",
    pendencia_financeira: false,
    visualizado_em,
    ...dados,
  };
}

describe("ChamadosLista", () => {
  it("exibe NOVO quando visualizado_em é nulo", () => {
    const html = renderToStaticMarkup(<ChamadosLista chamados={[chamado(null)]} />);
    expect(html).toContain("NOVO");
  });

  it("não exibe NOVO quando o chamado já foi visualizado", () => {
    const html = renderToStaticMarkup(
      <ChamadosLista chamados={[chamado("2026-09-15T22:00:00.000Z")]} />,
    );
    expect(html).not.toContain("NOVO");
  });

  it.each([
    ["100.00", "R$\u00a0100,00"],
    ["130.00", "R$\u00a0130,00"],
    ["160.00", "R$\u00a0160,00"],
  ])("exibe no card o valor financeiro %s fornecido pelo servidor", (valor, esperado) => {
    const html = renderToStaticMarkup(
      <ChamadosLista chamados={[chamado(null, { valor_card: valor })]} />,
    );
    expect(html).toContain(esperado);
  });

  it("identifica chamado encerrado sem recebível", () => {
    const html = renderToStaticMarkup(
      <ChamadosLista chamados={[chamado(null, {
        status: "Concluído",
        valor_card: null,
        pendencia_financeira: true,
      })]} />,
    );
    expect(html).toContain("Financeiro pendente");
    expect(html).not.toContain("R$\u00a0100,00");
  });
});
