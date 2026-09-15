import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { chamadoSimulacaoRatDasa } from "@/lib/rat-dasa-simulation";
import type { RatRegistro, RatRevisao } from "@/lib/rat-types";
import { criarRatDasaValida, tecnicoDasaSeguro } from "@/test/fixtures/rat-dasa";

const dependencias = vi.hoisted(() => ({
  buscarChamado: vi.fn(),
  buscarCliente: vi.fn(),
  buscarTecnico: vi.fn(),
  listarRats: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  notFound: () => { throw new Error("not-found"); },
  useRouter: () => ({ refresh: vi.fn() }),
}));
vi.mock("@/lib/db-observability", () => ({
  observeRequest: (_rota: string, executar: () => unknown) => executar(),
}));
vi.mock("@/lib/assinaturas-repository", () => ({
  buscarAssinaturaCliente: dependencias.buscarCliente,
  buscarAssinaturaTecnico: dependencias.buscarTecnico,
}));
vi.mock("@/lib/server-service", () => ({
  chamadosService: { buscar: dependencias.buscarChamado },
}));
vi.mock("@/lib/server-rat", () => ({
  ratService: { listar: dependencias.listarRats },
}));

import PrepararRat from "@/app/chamados/[id]/rat/page";

describe("seleção do formulário de RAT", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dependencias.buscarCliente.mockResolvedValue(null);
    dependencias.buscarTecnico.mockResolvedValue(null);
    dependencias.listarRats.mockResolvedValue([]);
  });

  it("carrega o formulário DASA na simulação sem consultar chamado ou versões", async () => {
    const pagina = await PrepararRat({
      params: Promise.resolve({ id: "20" }),
      searchParams: Promise.resolve({ simulacao: "dasa-v1" }),
    });
    const html = renderToStaticMarkup(pagina);

    expect(html).toContain("Preparação da RAT DASA");
    expect(html).not.toContain("Revisão da RAT");
    expect(dependencias.buscarChamado).not.toHaveBeenCalled();
    expect(dependencias.buscarCliente).not.toHaveBeenCalled();
    expect(dependencias.buscarTecnico).not.toHaveBeenCalled();
    expect(dependencias.listarRats).not.toHaveBeenCalled();
  });

  it("mantém cliente não DASA no formulário Claro e no fluxo atual de versões", async () => {
    dependencias.buscarChamado.mockResolvedValue({ ...chamadoSimulacaoRatDasa, cliente: "Claro" });
    const pagina = await PrepararRat({
      params: Promise.resolve({ id: "21" }),
      searchParams: Promise.resolve({}),
    });
    const html = renderToStaticMarkup(pagina);

    expect(html).toContain("Revisão da RAT");
    expect(html).toContain("Gerar RAT em PDF");
    expect(html).not.toContain("Preparação da RAT DASA");
    expect(dependencias.buscarCliente).toHaveBeenCalledWith(21);
    expect(dependencias.listarRats).toHaveBeenCalledWith(21);
  });

  it("reutiliza somente a revisão DASA compatível, nunca a revisão Claro mais recente", async () => {
    const revisaoDasa = criarRatDasaValida();
    revisaoDasa.atendimento.defeito_constatado = "Diagnóstico preservado da revisão DASA";
    const revisaoClaro = { chamado: "MI-CLARO", descricao: "Conteúdo exclusivo Claro" } as RatRevisao;
    const base = { chamado_id: 20, caminho_pdf: "20/rat.pdf", hash_pdf: "a".repeat(64), tecnico: "", status_rat: "Gerada", atual: false, gerado_em: "2026-09-15T12:00:00Z" };
    dependencias.buscarChamado.mockResolvedValue(chamadoSimulacaoRatDasa);
    dependencias.buscarTecnico.mockResolvedValue(tecnicoDasaSeguro);
    dependencias.listarRats.mockResolvedValue([
      { ...base, id: "claro", versao: 2, dados_revisao: revisaoClaro, modelo_rat: "claro", modelo_versao: 1, schema_versao: 1 } satisfies RatRegistro,
      { ...base, id: "dasa", versao: 1, dados_revisao: revisaoDasa, modelo_rat: "dasa", modelo_versao: 1, schema_versao: 1 } satisfies RatRegistro,
    ]);

    const pagina = await PrepararRat({ params: Promise.resolve({ id: "20" }), searchParams: Promise.resolve({}) });
    const html = renderToStaticMarkup(pagina);

    expect(html).toContain("Diagnóstico preservado da revisão DASA");
    expect(html).not.toContain("Conteúdo exclusivo Claro");
    expect(html).toContain("Técnico Exemplo");
  });
});
