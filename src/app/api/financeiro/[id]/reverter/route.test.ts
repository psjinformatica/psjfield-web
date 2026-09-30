import { beforeEach, describe, expect, it, vi } from "vitest";

const dependencias = vi.hoisted(() => ({ reverterRecebimento: vi.fn() }));

vi.mock("@/lib/server-financeiro", () => ({
  financeiroService: { reverterRecebimento: dependencias.reverterRecebimento },
}));
vi.mock("@/lib/db-observability", () => ({
  observeRequest: (_rota: string, operacao: () => unknown) => operacao(),
}));

import { POST } from "@/app/api/financeiro/[id]/reverter/route";

describe("POST /api/financeiro/[id]/reverter", () => {
  beforeEach(() => vi.clearAllMocks());

  it("reverte pelo service sem receber payload alterável", async () => {
    const id = "8e84b693-e79d-41b5-9e27-ce087109bd18";
    const resposta = await POST(new Request(`http://localhost/api/financeiro/${id}/reverter`, { method: "POST" }), {
      params: Promise.resolve({ id }),
    });

    expect(resposta.status).toBe(200);
    expect(dependencias.reverterRecebimento).toHaveBeenCalledExactlyOnceWith(id);
  });

  it("retorna erro controlado quando a conta não pode ser revertida", async () => {
    dependencias.reverterRecebimento.mockRejectedValueOnce(new Error("Conta não encontrada ou não está recebida."));
    const resposta = await POST(new Request("http://localhost/api/financeiro/invalida/reverter", { method: "POST" }), {
      params: Promise.resolve({ id: "invalida" }),
    });

    expect(resposta.status).toBe(400);
    await expect(resposta.json()).resolves.toEqual({ erro: "Conta não encontrada ou não está recebida." });
  });
});
