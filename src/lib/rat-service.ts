import { createHash, randomUUID } from "node:crypto";

import type { AssinaturaCliente, AssinaturaTecnico } from "@/lib/assinaturas-types";
import { criarHandlersRat, type RatHandler } from "@/lib/rat-handlers";
import type { ModeloRat } from "@/lib/rat-models";
import { resolverModeloRat } from "@/lib/rat-models";
import type { RatAssinaturasSnapshot, RatDadosRevisao, RatModeloPersistido, RatRegistro } from "@/lib/rat-types";
import type { Chamado } from "@/lib/types";

export interface RatGateway {
  buscarChamado(id: number): Promise<Chamado | null>;
  buscarCliente(id: number): Promise<AssinaturaCliente | null>;
  buscarTecnico(): Promise<AssinaturaTecnico | null>;
  listar(id: number): Promise<RatRegistro[]>;
  buscarRat(id: string, chamadoId: number): Promise<RatRegistro | null>;
  registrar(entrada: {
    id: string;
    chamado_id: number;
    caminho_pdf: string;
    hash_pdf: string;
    tecnico: string;
    dados_revisao: RatDadosRevisao;
    gerado_em: string;
    modelo_rat: RatModeloPersistido;
    modelo_versao: number;
    schema_versao: number;
    template_hash: string;
    assinaturas_snapshot: RatAssinaturasSnapshot;
  }): Promise<RatRegistro>;
}

export interface RatStorage {
  baixar(bucket: string, caminho: string): Promise<Uint8Array>;
  enviar(caminho: string, bytes: Uint8Array): Promise<void>;
  remover(caminho: string): Promise<void>;
  baixarPdf(caminho: string): Promise<Uint8Array>;
}

export type OpcoesRatService = {
  handlers?: Record<ModeloRat, RatHandler>;
  uuid?: () => string;
  agora?: () => Date;
  permitirDasa?: boolean;
};

export class RatService {
  private readonly handlers: Record<ModeloRat, RatHandler>;
  private readonly uuid: () => string;
  private readonly agora: () => Date;
  private readonly permitirDasa: boolean;

  constructor(
    private readonly gateway: RatGateway,
    private readonly storage: RatStorage,
    opcoes: OpcoesRatService = {},
  ) {
    this.handlers = opcoes.handlers ?? criarHandlersRat();
    this.uuid = opcoes.uuid ?? randomUUID;
    this.agora = opcoes.agora ?? (() => new Date());
    this.permitirDasa = opcoes.permitirDasa ?? false;
  }

  private validarId(id: number) {
    if (!Number.isSafeInteger(id) || id <= 0) throw new Error("Chamado inválido.");
  }

  listar(chamadoId: number) { this.validarId(chamadoId); return this.gateway.listar(chamadoId); }

  async gerarRat(chamadoId: number, entrada: unknown, confirmarCancelado = false) {
    this.validarId(chamadoId);
    const chamado = await this.gateway.buscarChamado(chamadoId);
    if (!chamado) throw new Error("Chamado não encontrado.");
    const modelo = resolverModeloRat(chamado);
    if (modelo === "dasa-v1" && !this.permitirDasa) {
      throw new Error("A geração oficial da RAT DASA está disponível somente na homologação local.");
    }
    if (!["Em atendimento", "Concluído", "Improdutivo", "Cancelado"].includes(chamado.status)) {
      throw new Error("A RAT pode ser gerada apenas para chamados em atendimento ou finalizados.");
    }
    if (chamado.status === "Cancelado" && !confirmarCancelado) {
      throw new Error("Confirme a geração da RAT para o chamado cancelado.");
    }
    const [cliente, tecnico] = await Promise.all([this.gateway.buscarCliente(chamadoId), this.gateway.buscarTecnico()]);
    const instante = this.agora().toISOString();
    const preparado = await this.handlers[modelo].preparar({
      entrada,
      cliente,
      tecnico,
      geradoEm: instante,
      carregarAssinatura: (bucket, caminho) => this.storage.baixar(bucket, caminho),
    });
    const id = this.uuid();
    const caminho = `${chamadoId}/${id}.pdf`;
    await this.storage.enviar(caminho, preparado.bytes);
    try {
      return await this.gateway.registrar({
        id, chamado_id: chamadoId, caminho_pdf: caminho,
        hash_pdf: createHash("sha256").update(preparado.bytes).digest("hex"),
        tecnico: preparado.tecnico,
        dados_revisao: preparado.dadosRevisao,
        gerado_em: instante,
        modelo_rat: preparado.identidade.modelo_rat,
        modelo_versao: preparado.identidade.modelo_versao,
        schema_versao: preparado.identidade.schema_versao,
        template_hash: preparado.templateHash,
        assinaturas_snapshot: preparado.assinaturasSnapshot,
      });
    } catch (erro) {
      await this.storage.remover(caminho).catch(() => undefined);
      throw erro;
    }
  }

  async baixar(chamadoId: number, ratId: string) {
    this.validarId(chamadoId);
    const [rat, chamado] = await Promise.all([
      this.gateway.buscarRat(ratId, chamadoId),
      this.gateway.buscarChamado(chamadoId),
    ]);
    if (!rat || !chamado) throw new Error("RAT não encontrada.");
    return { rat, chamado, bytes: await this.storage.baixarPdf(rat.caminho_pdf) };
  }
}
