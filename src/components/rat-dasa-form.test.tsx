import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import {
  CONFIRMACAO_EMISSAO_RAT_DASA,
  RatDasaForm,
  solicitarEmissaoOficialRatDasa,
  solicitarPreviaRatDasa,
  usarSolicitanteComoAcompanhante,
} from "@/components/rat-dasa-form";
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
    expect(html).not.toContain(">Gerar RAT<");
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
    expect(html).toContain("sem imagem incorporada, o nome identifica o respectivo campo");
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

  it("expõe as duas ações somente quando a persistência oficial é habilitada", () => {
    const bloqueado = renderToStaticMarkup(<RatDasaForm chamadoId={20} inicial={criarSimulacaoRatDasa()} />);
    const habilitado = renderToStaticMarkup(<RatDasaForm chamadoId={20} inicial={criarSimulacaoRatDasa()} persistenciaHabilitada />);
    expect(bloqueado).toContain("Gerar prévia da RAT");
    expect(bloqueado).not.toContain(">Gerar RAT<");
    expect(habilitado).toContain("Gerar prévia da RAT");
    expect(habilitado).toContain(">Gerar RAT<");
  });

  it("mantém a prévia no endpoint sem persistência", async () => {
    const solicitar = vi.fn().mockResolvedValue(new Response());
    await solicitarPreviaRatDasa(criarSimulacaoRatDasa(), solicitar);
    expect(solicitar).toHaveBeenCalledWith("/api/rat/dasa/preview", expect.objectContaining({ method: "POST" }));
    expect(solicitar).not.toHaveBeenCalledWith(expect.stringContaining("/api/chamados/"), expect.anything());
  });

  it("exige confirmação antes de chamar a persistência oficial", async () => {
    const ordem: string[] = [];
    const confirmar = vi.fn(() => { ordem.push("confirmar"); return true; });
    const solicitar = vi.fn(async () => { ordem.push("persistir"); return new Response(); });
    await solicitarEmissaoOficialRatDasa(20, criarSimulacaoRatDasa(), confirmar, solicitar);
    expect(confirmar).toHaveBeenCalledWith(CONFIRMACAO_EMISSAO_RAT_DASA);
    expect(solicitar).toHaveBeenCalledWith("/api/chamados/20/rat", expect.objectContaining({ method: "POST" }));
    expect(ordem).toEqual(["confirmar", "persistir"]);
  });

  it("não persiste quando a confirmação é recusada", async () => {
    const solicitar = vi.fn();
    await expect(solicitarEmissaoOficialRatDasa(20, criarSimulacaoRatDasa(), () => false, solicitar)).resolves.toBeNull();
    expect(solicitar).not.toHaveBeenCalled();
  });
});
