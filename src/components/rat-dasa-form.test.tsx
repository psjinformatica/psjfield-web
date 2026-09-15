import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { RatDasaForm, usarSolicitanteComoAcompanhante } from "@/components/rat-dasa-form";
import { criarSimulacaoRatDasa } from "@/lib/rat-dasa-simulation";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

describe("RatDasaForm", () => {
  it("exibe o fluxo DASA mobile-first com opcionais recolhidos", () => {
    const html = renderToStaticMarkup(<RatDasaForm chamadoId={20} inicial={criarSimulacaoRatDasa()} />);

    expect(html).toContain("Preparação da RAT DASA");
    expect(html).toContain("Solicitante do chamado");
    expect(html).toContain("Colaborador que acompanhou o atendimento");
    expect(html).toContain("Equipamento detalhado");
    expect(html).toContain("Checklist aplicado");
    expect(html).toContain("Checklist de formatação");
    expect(html).toContain("Gerar prévia da RAT");
    expect(html).not.toContain("Gerar RAT em PDF");
    expect(html).toContain("dasa-time-grid");
  });

  it("mantém solicitante e acompanhante distintos até ação explícita", () => {
    const inicial = criarSimulacaoRatDasa();
    inicial.local.solicitante = "Solicitante Revisado";
    inicial.cliente.nome_colaborador_acompanhante = "Acompanhante Revisado";

    expect(inicial.cliente.nome_colaborador_acompanhante).not.toBe(inicial.local.solicitante);
    expect(usarSolicitanteComoAcompanhante(inicial).cliente.nome_colaborador_acompanhante)
      .toBe("Solicitante Revisado");
  });

  it("não inicia checkboxes opcionais marcados e informa assinaturas opcionais", () => {
    const html = renderToStaticMarkup(<RatDasaForm chamadoId={20} inicial={criarSimulacaoRatDasa()} />);

    expect(html).not.toMatch(/type="checkbox"[^>]*checked/);
    expect(html).toContain("Assinaturas permanecem opcionais");
    expect(html).toContain("não são incluídas nesta simulação");
  });

  it("mostra dados automáticos e horários da simulação segura", () => {
    const html = renderToStaticMarkup(<RatDasaForm chamadoId={20} inicial={criarSimulacaoRatDasa()} />);

    expect(html).toContain("SR-855635");
    expect(html).toContain("UNIDADE-TESTE");
    expect(html).toContain("Solicitante Exemplo");
    expect(html).toContain("Técnico Exemplo");
    expect(html).toContain('value="2026-09-15"');
    expect(html).toContain('value="09:00"');
    expect(html).toContain('value="12:40"');
  });

  it("expõe geração versionada somente quando a homologação local é habilitada", () => {
    const html = renderToStaticMarkup(<RatDasaForm chamadoId={20} inicial={criarSimulacaoRatDasa()} persistenciaLocal />);
    expect(html).toContain("Gerar RAT DASA");
    expect(html).toContain("infraestrutura local");
    expect(html).not.toContain("Gerar prévia da RAT");
  });
});
