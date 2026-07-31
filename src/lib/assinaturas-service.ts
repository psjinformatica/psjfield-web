import { randomUUID } from "node:crypto";

import type {
  ArquivoAssinatura,
  AssinaturaCliente,
  AssinaturaClienteInput,
  AssinaturaTecnico,
  AssinaturaTecnicoInput,
  AssinaturaVisualizacao,
} from "@/lib/assinaturas-types";
import { validarArquivoAssinatura, validarResponsavel, validarTecnico } from "@/lib/assinaturas-validation";

export interface AssinaturasGateway {
  buscarCliente(chamadoId: number): Promise<AssinaturaCliente | null>;
  salvarCliente(assinatura: AssinaturaCliente): Promise<void>;
  buscarTecnico(): Promise<AssinaturaTecnico | null>;
  salvarTecnico(assinatura: AssinaturaTecnico): Promise<void>;
  registrarPendenciaStorage(caminho: string, motivo: string): Promise<void>;
}

export interface AssinaturasStorage {
  enviar(caminho: string, arquivo: ArquivoAssinatura): Promise<void>;
  remover(caminho: string): Promise<void>;
  urlTemporaria(caminho: string): Promise<string>;
}

export class AssinaturasService {
  constructor(
    private readonly gateway: AssinaturasGateway,
    private readonly storage: AssinaturasStorage,
    private readonly agora = () => new Date(),
    private readonly uuid = randomUUID,
  ) {}

  private validarChamadoId(id: number) {
    if (!Number.isSafeInteger(id) || id <= 0) throw new Error("Chamado inválido.");
  }

  private async comUrl<T extends { caminho_assinatura: string }>(assinatura: T | null) {
    if (!assinatura) return null;
    return { ...assinatura, assinatura_url: await this.storage.urlTemporaria(assinatura.caminho_assinatura) };
  }

  private async removerOuRegistrarPendencia(caminho: string, motivo: string) {
    try {
      await this.storage.remover(caminho);
    } catch {
      await this.gateway.registrarPendenciaStorage(caminho, motivo).catch(() => undefined);
    }
  }

  buscarCliente(chamadoId: number): Promise<AssinaturaVisualizacao<AssinaturaCliente> | null> {
    this.validarChamadoId(chamadoId);
    return this.gateway.buscarCliente(chamadoId).then((assinatura) => this.comUrl(assinatura));
  }

  buscarTecnico(): Promise<AssinaturaVisualizacao<AssinaturaTecnico> | null> {
    return this.gateway.buscarTecnico().then((assinatura) => this.comUrl(assinatura));
  }

  async salvarCliente(chamadoId: number, entrada: AssinaturaClienteInput) {
    this.validarChamadoId(chamadoId);
    const responsavel = validarResponsavel(entrada);
    const arquivo = validarArquivoAssinatura(entrada.arquivo);
    const anterior = await this.gateway.buscarCliente(chamadoId);
    const caminho = `clientes/${chamadoId}/assinatura-${this.uuid()}.png`;
    const instante = this.agora().toISOString();
    await this.storage.enviar(caminho, arquivo);
    try {
      await this.gateway.salvarCliente({
        chamado_id: chamadoId,
        ...responsavel,
        caminho_assinatura: caminho,
        assinado_em: instante,
        atualizado_em: instante,
      });
    } catch (erro) {
      await this.removerOuRegistrarPendencia(caminho, "Falha ao persistir assinatura do cliente");
      throw erro;
    }
    if (anterior?.caminho_assinatura && anterior.caminho_assinatura !== caminho) {
      await this.removerOuRegistrarPendencia(anterior.caminho_assinatura, "Substituição de assinatura do cliente");
    }
    return this.buscarCliente(chamadoId);
  }

  async salvarTecnico(entrada: AssinaturaTecnicoInput) {
    const { nome_tecnico } = validarTecnico(entrada);
    const arquivo = validarArquivoAssinatura(entrada.arquivo);
    const anterior = await this.gateway.buscarTecnico();
    const caminho = `tecnico/assinatura-padrao-${this.uuid()}.png`;
    const instante = this.agora().toISOString();
    await this.storage.enviar(caminho, arquivo);
    try {
      await this.gateway.salvarTecnico({
        id: 1,
        nome_tecnico,
        caminho_assinatura: caminho,
        atualizado_em: instante,
      });
    } catch (erro) {
      await this.removerOuRegistrarPendencia(caminho, "Falha ao persistir assinatura do técnico");
      throw erro;
    }
    if (anterior?.caminho_assinatura && anterior.caminho_assinatura !== caminho) {
      await this.removerOuRegistrarPendencia(anterior.caminho_assinatura, "Substituição de assinatura do técnico");
    }
    return this.buscarTecnico();
  }
}
