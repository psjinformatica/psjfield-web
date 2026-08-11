import { describe, expect, it } from "vitest";

import { FinanceiroService, type FinanceiroGateway } from "@/lib/financeiro-service";

describe("FinanceiroService", () => {
  it("valida e registra o recebimento", async () => {
    let recebido: unknown;
    const gateway: FinanceiroGateway = {
      listar: async () => [],
      marcarRecebida: async (id, valor, data) => { recebido = { id, valor, data }; },
    };
    const service = new FinanceiroService(gateway);
    await service.marcarRecebida("8e84b693-e79d-41b5-9e27-ce087109bd18", {
      valor_recebido: "130.50",
      recebido_em: "2026-08-11",
    });
    expect(recebido).toEqual({
      id: "8e84b693-e79d-41b5-9e27-ce087109bd18",
      valor: 130.5,
      data: "2026-08-11",
    });
  });

  it("rejeita valor ou data inválidos", async () => {
    const service = new FinanceiroService({ listar: async () => [], marcarRecebida: async () => undefined });
    await expect(service.marcarRecebida("inválido", {})).rejects.toThrow("Conta inválida");
    await expect(service.marcarRecebida("8e84b693-e79d-41b5-9e27-ce087109bd18", {
      valor_recebido: 0,
      recebido_em: "11/08/2026",
    })).rejects.toThrow();
  });
});
