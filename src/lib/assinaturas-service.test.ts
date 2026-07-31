import { describe, expect, it } from "vitest";

import { AssinaturasService, type AssinaturasGateway, type AssinaturasStorage } from "@/lib/assinaturas-service";
import type { ArquivoAssinatura, AssinaturaCliente, AssinaturaTecnico } from "@/lib/assinaturas-types";

const png: ArquivoAssinatura = {
  bytes: new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 1]),
  tipo: "image/png",
  tamanho: 9,
};

class GatewayMemoria implements AssinaturasGateway {
  clientes = new Map<number, AssinaturaCliente>();
  tecnico: AssinaturaTecnico | null = null;
  pendencias: Array<{ caminho: string; motivo: string }> = [];
  falhar = false;
  async buscarCliente(id: number) { return this.clientes.get(id) || null; }
  async salvarCliente(assinatura: AssinaturaCliente) {
    if (this.falhar) throw new Error("Banco indisponível");
    this.clientes.set(assinatura.chamado_id, assinatura);
  }
  async buscarTecnico() { return this.tecnico; }
  async salvarTecnico(assinatura: AssinaturaTecnico) {
    if (this.falhar) throw new Error("Banco indisponível");
    this.tecnico = assinatura;
  }
  async registrarPendenciaStorage(caminho: string, motivo: string) {
    this.pendencias.push({ caminho, motivo });
  }
}

class StorageMemoria implements AssinaturasStorage {
  arquivos = new Set<string>();
  removidos: string[] = [];
  async enviar(caminho: string) { this.arquivos.add(caminho); }
  async remover(caminho: string) { this.arquivos.delete(caminho); this.removidos.push(caminho); }
  async urlTemporaria(caminho: string) { return `https://storage.invalid/${caminho}`; }
}

function criarServico(gateway = new GatewayMemoria(), storage = new StorageMemoria()) {
  let sequencia = 0;
  return {
    gateway,
    storage,
    service: new AssinaturasService(
      gateway,
      storage,
      () => new Date("2026-07-31T17:32:00.000Z"),
      () => `arquivo-${++sequencia}`,
    ),
  };
}

describe("AssinaturasService", () => {
  it("persiste e lê a assinatura do cliente com URL temporária", async () => {
    const { service } = criarServico();
    const assinatura = await service.salvarCliente(7, {
      nome_responsavel: "Maria Silva",
      documento_responsavel: "123",
      arquivo: png,
    });
    expect(assinatura).toMatchObject({
      chamado_id: 7,
      nome_responsavel: "Maria Silva",
      assinado_em: "2026-07-31T17:32:00.000Z",
    });
    expect((await service.buscarCliente(7))?.assinatura_url).toContain("clientes/7/");
  });

  it("substitui somente depois de salvar e remove o arquivo anterior", async () => {
    const { service, storage } = criarServico();
    const primeira = await service.salvarCliente(7, { nome_responsavel: "Maria", documento_responsavel: "", arquivo: png });
    const segunda = await service.salvarCliente(7, { nome_responsavel: "Maria", documento_responsavel: "", arquivo: png });
    expect(segunda?.caminho_assinatura).not.toBe(primeira?.caminho_assinatura);
    expect(storage.removidos).toContain(primeira?.caminho_assinatura);
  });

  it("mantém o registro anterior quando a atualização do banco falha", async () => {
    const { service, gateway, storage } = criarServico();
    const primeira = await service.salvarCliente(7, { nome_responsavel: "Maria", documento_responsavel: "", arquivo: png });
    gateway.falhar = true;
    await expect(service.salvarCliente(7, { nome_responsavel: "Joana", documento_responsavel: "", arquivo: png }))
      .rejects.toThrow("Banco indisponível");
    expect((await gateway.buscarCliente(7))?.nome_responsavel).toBe("Maria");
    expect(storage.arquivos.has(primeira!.caminho_assinatura)).toBe(true);
    expect(storage.arquivos.size).toBe(1);
  });

  it("persiste uma única assinatura padrão do técnico", async () => {
    const { service, gateway } = criarServico();
    await service.salvarTecnico({ nome_tecnico: "Técnico inicial", arquivo: png });
    const atualizada = await service.salvarTecnico({ nome_tecnico: "Técnico substituto", arquivo: png });
    expect(gateway.tecnico?.id).toBe(1);
    expect(atualizada?.nome_tecnico).toBe("Técnico substituto");
  });

  it("registra pendência quando não consegue limpar arquivo substituído", async () => {
    const { service, gateway, storage } = criarServico();
    await service.salvarCliente(7, { nome_responsavel: "Maria", documento_responsavel: "", arquivo: png });
    storage.remover = async () => { throw new Error("Storage indisponível"); };
    await service.salvarCliente(7, { nome_responsavel: "Maria", documento_responsavel: "", arquivo: png });
    expect(gateway.pendencias[0]).toMatchObject({ motivo: "Substituição de assinatura do cliente" });
  });
});
