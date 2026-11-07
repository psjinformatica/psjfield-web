import { describe, expect, it, vi } from "vitest";

import { FinanceiroService, type FinanceiroGateway } from "@/lib/financeiro-service";

describe("FinanceiroService", () => {
  it("valida e registra o recebimento", async () => {
    let recebido: unknown;
    const conta = { previsao_recebimento: "2026-09-15", valor_recebido: null as number | null };
    const gateway: FinanceiroGateway = {
      listar: async () => [],
      marcarRecebida: async (id, valor, data) => {
        conta.valor_recebido = valor;
        recebido = { id, valor, data };
      },
      reverterRecebimento: async () => undefined,
      prepararCorrecao: async () => undefined as never,
      aplicarCorrecao: async () => undefined as never,
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
    expect(conta).toEqual({ previsao_recebimento: "2026-09-15", valor_recebido: 130.5 });
  });

  it("rejeita valor ou data inválidos", async () => {
    const service = new FinanceiroService({
      listar: async () => [],
      marcarRecebida: async () => undefined,
      reverterRecebimento: async () => undefined,
      prepararCorrecao: async () => undefined as never,
      aplicarCorrecao: async () => undefined as never,
    });
    await expect(service.marcarRecebida("inválido", {})).rejects.toThrow("Conta inválida");
    await expect(service.marcarRecebida("8e84b693-e79d-41b5-9e27-ce087109bd18", {
      valor_recebido: 0,
      recebido_em: "11/08/2026",
    })).rejects.toThrow();
  });

  it("reverte o recebimento, persiste o estado pendente e permite receber novamente sem duplicar", async () => {
    const id = "8e84b693-e79d-41b5-9e27-ce087109bd18";
    const registros: Array<{
      id: string;
      situacao: string;
      recebido_em: string | null;
      valor_recebido: number | null;
    }> = [{
      id,
      situacao: "RECEBIDO",
      recebido_em: "2026-10-14",
      valor_recebido: 130,
    }];
    const gateway: FinanceiroGateway = {
      listar: async () => registros as never,
      marcarRecebida: async (contaId, valor, data) => {
        const conta = registros.find((item) => item.id === contaId);
        if (!conta || conta.situacao === "RECEBIDO") throw new Error("Conta já recebida.");
        conta.situacao = "RECEBIDO";
        conta.recebido_em = data;
        conta.valor_recebido = valor;
      },
      reverterRecebimento: async (contaId) => {
        const conta = registros.find((item) => item.id === contaId);
        if (!conta || conta.situacao !== "RECEBIDO") throw new Error("Conta não recebida.");
        conta.situacao = "A_RECEBER";
        conta.recebido_em = null;
        conta.valor_recebido = null;
      },
      prepararCorrecao: async () => undefined as never,
      aplicarCorrecao: async () => undefined as never,
    };
    const service = new FinanceiroService(gateway);

    await service.reverterRecebimento(id);
    await expect(service.listar()).resolves.toEqual([{
      id,
      situacao: "A_RECEBER",
      recebido_em: null,
      valor_recebido: null,
    }]);

    await service.marcarRecebida(id, { valor_recebido: "130", recebido_em: "2026-10-15" });
    expect(registros).toHaveLength(1);
    expect(registros[0]).toMatchObject({
      situacao: "RECEBIDO",
      recebido_em: "2026-10-15",
      valor_recebido: 130,
    });
  });

  it("rejeita reversão com identificador inválido", async () => {
    const gateway: FinanceiroGateway = {
      listar: async () => [],
      marcarRecebida: async () => undefined,
      reverterRecebimento: async () => undefined,
      prepararCorrecao: async () => undefined as never,
      aplicarCorrecao: async () => undefined as never,
    };
    await expect(new FinanceiroService(gateway).reverterRecebimento("inválido")).rejects.toThrow("Conta inválida");
  });

  it("valida a prévia e exige motivo, confirmação e versão para aplicar", async () => {
    const id = "8e84b693-e79d-41b5-9e27-ce087109bd18";
    const prepararCorrecao = vi.fn().mockResolvedValue({ versao: "a".repeat(64) });
    const aplicarCorrecao = vi.fn().mockResolvedValue({ versao: "a".repeat(64) });
    const service = new FinanceiroService({
      listar: async () => [], marcarRecebida: async () => undefined,
      reverterRecebimento: async () => undefined, prepararCorrecao, aplicarCorrecao,
    });
    const parametros = { valor_base: "130", horas_incluidas: "3", valor_hora_adicional: "30" };
    await service.prepararCorrecao(id, { parametros });
    expect(prepararCorrecao).toHaveBeenCalledWith(id, { valor_base: 130, horas_incluidas: 3, valor_hora_adicional: 30 });
    await expect(service.aplicarCorrecao(id, { parametros, motivo: "Ajuste", confirmado: false, versao: "a".repeat(64) })).rejects.toThrow();
    await service.aplicarCorrecao(id, { parametros, motivo: "Ajuste comercial", confirmado: true, versao: "a".repeat(64) });
    expect(aplicarCorrecao).toHaveBeenCalledWith(id, { valor_base: 130, horas_incluidas: 3, valor_hora_adicional: 30 }, "Ajuste comercial", "a".repeat(64));
  });
});
