import { describe, expect, it, vi } from "vitest";

import { confirmarImportacaoENavegar } from "@/components/importar-form";

function criarRoteador() {
  return {
    replace: vi.fn(),
    refresh: vi.fn(),
  };
}

describe("confirmarImportacaoENavegar", () => {
  it("faz uma única navegação para o chamado criado sem atualizar a rota", async () => {
    const solicitar = vi.fn(async () => Response.json({ id: 42 }));
    const router = criarRoteador();

    await confirmarImportacaoENavegar(new FormData(), solicitar, router);

    expect(solicitar).toHaveBeenCalledOnce();
    expect(solicitar).toHaveBeenCalledWith("/api/importar/confirmar", {
      method: "POST",
      body: expect.any(FormData),
    });
    expect(router.replace).toHaveBeenCalledOnce();
    expect(router.replace).toHaveBeenCalledWith("/chamados/42");
    expect(router.refresh).not.toHaveBeenCalled();
  });

  it("não navega quando a importação falha", async () => {
    const solicitar = vi.fn(async () => Response.json(
      { erro: "Não foi possível importar." },
      { status: 400 },
    ));
    const router = criarRoteador();

    await expect(confirmarImportacaoENavegar(new FormData(), solicitar, router))
      .rejects.toThrow("Não foi possível importar.");

    expect(router.replace).not.toHaveBeenCalled();
    expect(router.refresh).not.toHaveBeenCalled();
  });
});
