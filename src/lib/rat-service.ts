import { createHash, randomUUID } from "node:crypto";

import type { AssinaturaCliente, AssinaturaTecnico } from "@/lib/assinaturas-types";
import { gerarRatPdf } from "@/lib/rat-pdf";
import type { RatRegistro, RatRevisao } from "@/lib/rat-types";
import { validarRatRevisao } from "@/lib/rat-validation";
import type { Chamado } from "@/lib/types";

export interface RatGateway {
  buscarChamado(id: number): Promise<Chamado | null>;
  buscarCliente(id: number): Promise<AssinaturaCliente | null>;
  buscarTecnico(): Promise<AssinaturaTecnico | null>;
  listar(id: number): Promise<RatRegistro[]>;
  buscarRat(id: string, chamadoId: number): Promise<RatRegistro | null>;
  registrar(entrada: { id: string; chamado_id: number; caminho_pdf: string; hash_pdf: string; tecnico: string; dados_revisao: RatRevisao; gerado_em: string }): Promise<RatRegistro>;
}

export interface RatStorage {
  baixar(bucket: string, caminho: string): Promise<Uint8Array>;
  enviar(caminho: string, bytes: Uint8Array): Promise<void>;
  remover(caminho: string): Promise<void>;
  baixarPdf(caminho: string): Promise<Uint8Array>;
}

export class RatService {
  constructor(
    private readonly gateway: RatGateway,
    private readonly storage: RatStorage,
    private readonly gerar = gerarRatPdf,
    private readonly uuid = randomUUID,
    private readonly agora = () => new Date(),
  ) {}

  private validarId(id: number) {
    if (!Number.isSafeInteger(id) || id <= 0) throw new Error("Chamado inválido.");
  }

  listar(chamadoId: number) { this.validarId(chamadoId); return this.gateway.listar(chamadoId); }

  async gerarRat(chamadoId: number, entrada: unknown, confirmarCancelado = false) {
    this.validarId(chamadoId);
    const chamado = await this.gateway.buscarChamado(chamadoId);
    if (!chamado) throw new Error("Chamado não encontrado.");
    if (!["Em atendimento", "Concluído", "Improdutivo", "Cancelado"].includes(chamado.status)) {
      throw new Error("A RAT pode ser gerada apenas para chamados em atendimento ou finalizados.");
    }
    if (chamado.status === "Cancelado" && !confirmarCancelado) {
      throw new Error("Confirme a geração da RAT para o chamado cancelado.");
    }
    const dados = validarRatRevisao(entrada);
    const [cliente, tecnico] = await Promise.all([this.gateway.buscarCliente(chamadoId), this.gateway.buscarTecnico()]);
    const [clienteBytes, tecnicoBytes] = await Promise.all([
      cliente ? this.storage.baixar("assinaturas", cliente.caminho_assinatura) : undefined,
      tecnico ? this.storage.baixar("assinaturas", tecnico.caminho_assinatura) : undefined,
    ]);
    const instante = this.agora().toISOString();
    const bytes = await this.gerar(dados, {
      cliente: cliente && clienteBytes ? { nome: cliente.nome_responsavel, documento: cliente.documento_responsavel, assinado_em: cliente.assinado_em, bytes: clienteBytes } : undefined,
      tecnico: tecnico && tecnicoBytes ? { nome: tecnico.nome_tecnico, assinado_em: instante, bytes: tecnicoBytes } : undefined,
    });
    const id = this.uuid();
    const caminho = `${chamadoId}/${id}.pdf`;
    await this.storage.enviar(caminho, bytes);
    try {
      return await this.gateway.registrar({
        id, chamado_id: chamadoId, caminho_pdf: caminho,
        hash_pdf: createHash("sha256").update(bytes).digest("hex"),
        tecnico: tecnico?.nome_tecnico || "", dados_revisao: dados, gerado_em: instante,
      });
    } catch (erro) {
      await this.storage.remover(caminho).catch(() => undefined);
      throw erro;
    }
  }

  async baixar(chamadoId: number, ratId: string) {
    this.validarId(chamadoId);
    const rat = await this.gateway.buscarRat(ratId, chamadoId);
    if (!rat) throw new Error("RAT não encontrada.");
    return { rat, bytes: await this.storage.baixarPdf(rat.caminho_pdf) };
  }
}
