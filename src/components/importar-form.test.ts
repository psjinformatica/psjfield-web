import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

import { CampoRevisaoImportacao, confirmarImportacaoENavegar } from "@/components/importar-form";

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

describe("CampoRevisaoImportacao", () => {
  it("usa área multilinha para unidade longa sem truncar o valor", () => {
    const unidade = "FRISCHMANN | Unidade | D279 | FS - PALLADIUM";
    const html = renderToStaticMarkup(CampoRevisaoImportacao({
      campo: "unidade_nome",
      rotulo: "Unidade/Nome",
      valor: unidade,
      onChange: vi.fn(),
    }));

    expect(html).toContain("<textarea");
    expect(html).toContain(unidade);
  });

  it("mantém controles específicos para cliente e número do chamado", () => {
    const cliente = renderToStaticMarkup(CampoRevisaoImportacao({
      campo: "cliente", rotulo: "Cliente", valor: "DASA", onChange: vi.fn(),
    }));
    const numero = renderToStaticMarkup(CampoRevisaoImportacao({
      campo: "numero_chamado", rotulo: "Número do chamado", valor: "SR-1", onChange: vi.fn(),
    }));

    expect(cliente).toContain('list="clientes-importacao"');
    expect(numero).toContain("pattern=");
  });
});
