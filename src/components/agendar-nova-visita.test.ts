import { describe, expect, it, vi } from "vitest";

import { criarVisitaENavegar } from "@/components/agendar-nova-visita";

describe("criarVisitaENavegar", () => {
  it("cria uma ocorrência e navega uma única vez pelo novo ID", async () => {
    const solicitar = vi.fn(async () => Response.json({ id: 25, visita_numero: 2 }, { status: 201 }));
    const router = { replace: vi.fn(), refresh: vi.fn() };
    const dados = { data_agendada: "2026-09-29", hora_agendada: "09:30", unidade_nome: "Unidade Teste" };

    await criarVisitaENavegar(24, dados, solicitar, router);

    expect(solicitar).toHaveBeenCalledOnce();
    expect(solicitar).toHaveBeenCalledWith("/api/chamados/24/visitas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dados),
    });
    expect(router.replace).toHaveBeenCalledOnce();
    expect(router.replace).toHaveBeenCalledWith("/chamados/25");
    expect(router.refresh).not.toHaveBeenCalled();
  });

  it("não navega quando a criação falha", async () => {
    const solicitar = vi.fn(async () => Response.json({ erro: "Unidade obrigatória" }, { status: 400 }));
    const router = { replace: vi.fn() };

    await expect(criarVisitaENavegar(24, {
      data_agendada: "2026-09-29", hora_agendada: "09:30", unidade_nome: "",
    }, solicitar, router)).rejects.toThrow("Unidade obrigatória");
    expect(router.replace).not.toHaveBeenCalled();
  });
});
