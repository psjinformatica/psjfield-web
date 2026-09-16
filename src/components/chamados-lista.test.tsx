import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ChamadosLista } from "@/components/chamados-lista";
import type { ChamadoResumo } from "@/lib/types";

function chamado(visualizado_em: string | null): ChamadoResumo {
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
    valor_base: null,
    visualizado_em,
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
});
