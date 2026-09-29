import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { chamadoDasaSeguro } from "@/test/fixtures/rat-dasa";

const dependencias = vi.hoisted(() => ({
  buscarChamado: vi.fn(),
  listarVisitas: vi.fn(),
  buscarCliente: vi.fn(),
  buscarTecnico: vi.fn(),
  listarRats: vi.fn(),
  marcarAcessado: vi.fn(),
}));

vi.mock("next/navigation", () => ({ notFound: () => { throw new Error("not-found"); } }));
vi.mock("@/lib/db-observability", () => ({
  observeRequest: (_rota: string, executar: () => unknown) => executar(),
}));
vi.mock("@/lib/server-service", () => ({
  chamadosService: {
    buscar: dependencias.buscarChamado,
    listarVisitas: dependencias.listarVisitas,
  },
}));
vi.mock("@/lib/server-signatures", () => ({
  assinaturasService: {
    buscarCliente: dependencias.buscarCliente,
    buscarTecnico: dependencias.buscarTecnico,
  },
}));
vi.mock("@/lib/server-rat", () => ({ ratService: { listar: dependencias.listarRats } }));
vi.mock("@/components/atendimento-form", () => ({ AtendimentoForm: () => null }));
vi.mock("@/components/agendar-nova-visita", () => ({ AgendarNovaVisita: () => null }));
vi.mock("@/components/assinaturas-atendimento", () => ({ AssinaturasAtendimento: () => null }));
vi.mock("@/components/excluir-chamado", () => ({ ExcluirChamado: () => null }));
vi.mock("@/components/marcar-chamado-acessado", () => ({
  MarcarChamadoAcessado: ({ id }: { id: number }) => {
    dependencias.marcarAcessado(id);
    return null;
  },
}));
vi.mock("@/components/chamado-visitas", () => ({ ChamadoVisitas: () => null }));
vi.mock("@/components/rat-arquivo-acoes", () => ({ RatArquivoAcoes: () => null }));

import DetalheChamado from "@/app/chamados/[id]/page";

const unidadeVisita2 = "FRISCHMANN | Unidade | D279 | FS - PALLADIUM";

describe("detalhe do chamado", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dependencias.buscarCliente.mockResolvedValue(null);
    dependencias.buscarTecnico.mockResolvedValue(null);
    dependencias.listarRats.mockResolvedValue([]);
    dependencias.listarVisitas.mockResolvedValue([]);
  });

  it("exibe a unidade longa da própria visita e mantém o equipamento separado", async () => {
    dependencias.buscarChamado.mockResolvedValue({
      ...chamadoDasaSeguro,
      id: 25,
      visita_numero: 2,
      chamado_raiz_id: 24,
      unidade_nome: unidadeVisita2,
      equipamento: "Etiquetadora",
      fabricante: "ZEBRA",
      modelo: "Zebra ZD220T",
      numero_serie: "D5N220400706",
    });
    dependencias.listarVisitas.mockResolvedValue([
      { id: 24, visita_numero: 1, unidade_nome: "Unidade da raiz" },
      { id: 25, visita_numero: 2, unidade_nome: unidadeVisita2 },
    ]);

    const pagina = await DetalheChamado({ params: Promise.resolve({ id: "25" }) });
    const html = renderToStaticMarkup(pagina);

    expect(html).toContain(`<span>Unidade</span><strong>${unidadeVisita2}</strong>`);
    expect(html).toContain("chamado-unidade");
    expect(html).not.toContain("Unidade da raiz");
    expect(html).toContain("Etiquetadora");
    expect(html).toContain("ZEBRA");
    expect(html).toContain("Zebra ZD220T");
    expect(html).toContain("D5N220400706");
    expect(html).toContain('href="/chamados/25/editar"');
    expect(html).toContain("Editar dados do chamado");
  });

  it("oculta a linha de unidade quando o valor é nulo", async () => {
    dependencias.buscarChamado.mockResolvedValue({ ...chamadoDasaSeguro, unidade_nome: null });

    const pagina = await DetalheChamado({ params: Promise.resolve({ id: "20" }) });
    const html = renderToStaticMarkup(pagina);

    expect(html).not.toContain("chamado-unidade");
    expect(html).not.toContain("<span>Unidade</span>");
  });

  it("exibe unidade para qualquer cliente, sem condicionar ao modelo DASA", async () => {
    dependencias.buscarChamado.mockResolvedValue({
      ...chamadoDasaSeguro,
      cliente: "Claro",
      unidade_nome: "Unidade informada pelo cliente",
    });

    const pagina = await DetalheChamado({ params: Promise.resolve({ id: "20" }) });
    const html = renderToStaticMarkup(pagina);

    expect(html).toContain("Unidade informada pelo cliente");
  });

  it("não dispara escrita de visualização quando o chamado já foi visualizado", async () => {
    dependencias.buscarChamado.mockResolvedValue({
      ...chamadoDasaSeguro,
      visualizado_em: "2026-09-29T13:00:00.000Z",
    });

    const pagina = await DetalheChamado({ params: Promise.resolve({ id: "20" }) });
    renderToStaticMarkup(pagina);

    expect(dependencias.marcarAcessado).not.toHaveBeenCalled();
  });

  it("mantém a primeira marcação quando visualizado_em é nulo", async () => {
    dependencias.buscarChamado.mockResolvedValue({ ...chamadoDasaSeguro, visualizado_em: null });

    const pagina = await DetalheChamado({ params: Promise.resolve({ id: "20" }) });
    renderToStaticMarkup(pagina);

    expect(dependencias.marcarAcessado).toHaveBeenCalledOnce();
    expect(dependencias.marcarAcessado).toHaveBeenCalledWith(20);
  });
});
