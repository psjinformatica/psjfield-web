import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ChamadoVisitas } from "@/components/chamado-visitas";
import { exibirIdentificacaoVisita, obterChamadoRaizId, rotuloVisita } from "@/lib/chamados-visitas";

describe("múltiplas visitas", () => {
  it("resolve a raiz lógica sem formar cadeias", () => {
    expect(obterChamadoRaizId({ id: 24, chamado_raiz_id: null })).toBe(24);
    expect(obterChamadoRaizId({ id: 25, chamado_raiz_id: 24 })).toBe(24);
    expect(obterChamadoRaizId({ id: 26, chamado_raiz_id: 24 })).toBe(24);
  });

  it("só exibe o rótulo quando há mais de uma ocorrência", () => {
    expect(exibirIdentificacaoVisita(1)).toBe(false);
    expect(exibirIdentificacaoVisita(3)).toBe(true);
    expect(rotuloVisita(3)).toBe("Visita 3");
  });

  it("renderiza histórico ordenado, navegável e com RAT isolada por visita", () => {
    const html = renderToStaticMarkup(<ChamadoVisitas atualId={25} visitas={[
      { id: 24, visita_numero: 1, status: "Improdutivo", data_agendada: "2026-09-28", hora_agendada: "15:00", unidade_nome: null, quantidade_rats: 2 },
      { id: 25, visita_numero: 2, status: "Agendado", data_agendada: "2026-09-29", hora_agendada: "09:30", unidade_nome: "Unidade Teste", quantidade_rats: 0 },
    ]} />);
    expect(html.indexOf("Visita 1")).toBeLessThan(html.indexOf("Visita 2"));
    expect(html).toContain('href="/chamados/24"');
    expect(html).toContain('href="/chamados/25"');
    expect(html).toContain('aria-current="page"');
    expect(html).toContain("RAT disponível (2)");
  });
});
