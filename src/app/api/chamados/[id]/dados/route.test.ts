import { beforeEach, describe, expect, it, vi } from "vitest";

const dependencias = vi.hoisted(() => ({ editar: vi.fn() }));

vi.mock("@/lib/server-service", () => ({ chamadosService: { editarDados: dependencias.editar } }));
vi.mock("@/lib/db-observability", () => ({ observeRequest: (_rota: string, executar: () => unknown) => executar() }));

import { PUT } from "@/app/api/chamados/[id]/dados/route";
import { ConflitoEdicaoChamadoError } from "@/lib/chamados-edicao";

describe("PUT /api/chamados/[id]/dados", () => {
  beforeEach(() => vi.clearAllMocks());

  it("encaminha a edição validada ao service", async () => {
    dependencias.editar.mockResolvedValue({ alterados: 1, campos_alterados: ["endereco"] });
    const corpo = { dados: { endereco: "Corrigido" } };
    const resposta = await PUT(new Request("http://local/api/chamados/25/dados", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(corpo),
    }), { params: Promise.resolve({ id: "25" }) });

    expect(resposta.status).toBe(200);
    expect(dependencias.editar).toHaveBeenCalledWith(25, corpo);
  });

  it("responde 409 quando outra tela alterou os dados", async () => {
    dependencias.editar.mockRejectedValue(new ConflitoEdicaoChamadoError());
    const resposta = await PUT(new Request("http://local/api/chamados/25/dados", {
      method: "PUT",
      body: JSON.stringify({}),
    }), { params: Promise.resolve({ id: "25" }) });
    expect(resposta.status).toBe(409);
    await expect(resposta.json()).resolves.toMatchObject({ erro: expect.stringContaining("outra tela") });
  });
});
