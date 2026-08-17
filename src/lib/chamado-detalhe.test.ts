import { describe, expect, it } from "vitest";

import { carregarComplementosChamado } from "@/lib/chamado-detalhe";

describe("carregarComplementosChamado", () => {
  it("carrega cliente, técnico e RAT sequencialmente", async () => {
    const ordem: string[] = [];
    let liberarCliente!: (valor: string) => void;
    let liberarTecnico!: (valor: string) => void;
    const cliente = new Promise<string>((resolve) => { liberarCliente = resolve; });
    const tecnico = new Promise<string>((resolve) => { liberarTecnico = resolve; });

    const carregamento = carregarComplementosChamado({
      cliente: async () => { ordem.push("cliente"); return cliente; },
      tecnico: async () => { ordem.push("tecnico"); return tecnico; },
      rats: async () => { ordem.push("rats"); return ["rat atual"]; },
    });

    expect(ordem).toEqual(["cliente"]);
    liberarCliente("assinatura cliente");
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(ordem).toEqual(["cliente", "tecnico"]);
    liberarTecnico("assinatura técnico");
    const resultado = await carregamento;
    expect(ordem).toEqual(["cliente", "tecnico", "rats"]);
    expect(resultado).toEqual({
      assinaturaCliente: "assinatura cliente",
      assinaturaTecnico: "assinatura técnico",
      rats: ["rat atual"],
    });
  });
});
