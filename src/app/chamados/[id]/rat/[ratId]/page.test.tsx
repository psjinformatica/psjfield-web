import { describe, expect, it, vi } from "vitest";

const dependencias = vi.hoisted(() => ({
  buscarChamado: vi.fn(),
  listarRats: vi.fn(),
}));

vi.mock("next/navigation", () => ({ notFound: () => { throw new Error("not-found"); } }));
vi.mock("@/lib/db-observability", () => ({
  observeRequest: (_rota: string, executar: () => unknown) => executar(),
}));
vi.mock("@/lib/server-service", () => ({
  chamadosService: { buscar: dependencias.buscarChamado },
}));
vi.mock("@/lib/server-rat", () => ({
  ratService: { listar: dependencias.listarRats },
}));
vi.mock("@/components/rat-arquivo-acoes", () => ({ RatArquivoAcoes: () => null }));

import VisualizarRat from "@/app/chamados/[id]/rat/[ratId]/page";

describe("visualização de uma versão da RAT", () => {
  it("busca chamado e versões estritamente em sequência", async () => {
    let liberarChamado!: () => void;
    const pausa = new Promise<void>((resolve) => { liberarChamado = resolve; });
    dependencias.buscarChamado.mockImplementation(async () => {
      await pausa;
      return { id: 25, numero_chamado: "SR-906366", visita_numero: 2 };
    });
    dependencias.listarRats.mockResolvedValue([{ id: "rat-1", versao: 1 }]);

    const pagina = VisualizarRat({ params: Promise.resolve({ id: "25", ratId: "rat-1" }) });
    await Promise.resolve();
    await Promise.resolve();
    expect(dependencias.buscarChamado).toHaveBeenCalledOnce();
    expect(dependencias.listarRats).not.toHaveBeenCalled();
    liberarChamado();
    await expect(pagina).resolves.toBeTruthy();
    expect(dependencias.listarRats).toHaveBeenCalledOnce();
  });
});
