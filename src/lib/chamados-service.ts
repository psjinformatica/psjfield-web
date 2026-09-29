import type {
  AtendimentoInput,
  AtendimentoAtualizado,
  Chamado,
  ChamadoDuplicado,
  ChamadoImportacao,
  ChamadoResumo,
  ChamadoFinalizado,
  FinalizacaoInput,
  ChamadoReaberto,
  NovaVisitaCriada,
  NovaVisitaInput,
  ReaberturaInput,
} from "@/lib/types";
import { resolverModeloRat } from "@/lib/rat-models";
import { validarAtendimento, validarFinalizacao, validarNovaVisita, validarReabertura } from "@/lib/validation";

export interface ChamadosGateway {
  listar(): Promise<ChamadoResumo[]>;
  buscar(id: number): Promise<Chamado | null>;
  marcarVisualizado(id: number): Promise<boolean>;
  atualizar(id: number, dados: AtendimentoInput): Promise<AtendimentoAtualizado>;
  finalizar(id: number, dados: FinalizacaoInput): Promise<ChamadoFinalizado>;
  reabrir(id: number, dados: ReaberturaInput): Promise<ChamadoReaberto>;
  criarVisita(id: number, dados: NovaVisitaInput): Promise<NovaVisitaCriada>;
  buscarHash(hash: string): Promise<ChamadoDuplicado | null>;
  importar(chamado: ChamadoImportacao, nomeArquivo: string): Promise<number>;
  excluir(id: number): Promise<void>;
}

export class ChamadosService {
  constructor(private readonly gateway: ChamadosGateway) {}

  listar() {
    return this.gateway.listar();
  }

  buscar(id: number) {
    if (!Number.isSafeInteger(id) || id <= 0) throw new Error("Chamado inválido.");
    return this.gateway.buscar(id);
  }

  marcarVisualizado(id: number) {
    if (!Number.isSafeInteger(id) || id <= 0) throw new Error("Chamado inválido.");
    return this.gateway.marcarVisualizado(id);
  }

  buscarHash(hash: string) {
    return this.gateway.buscarHash(hash);
  }

  async atualizar(id: number, entrada: unknown) {
    if (!Number.isSafeInteger(id) || id <= 0) throw new Error("Chamado inválido.");
    return this.gateway.atualizar(id, validarAtendimento(entrada));
  }

  async finalizar(id: number, entrada: unknown) {
    if (!Number.isSafeInteger(id) || id <= 0) throw new Error("Chamado inválido.");
    return this.gateway.finalizar(id, validarFinalizacao(entrada));
  }

  async reabrir(id: number, entrada: unknown) {
    if (!Number.isSafeInteger(id) || id <= 0) throw new Error("Chamado inválido.");
    return this.gateway.reabrir(id, validarReabertura(entrada));
  }

  async criarVisita(id: number, entrada: unknown) {
    if (!Number.isSafeInteger(id) || id <= 0) throw new Error("Chamado inválido.");
    const chamado = await this.gateway.buscar(id);
    if (!chamado) throw new Error("Chamado não encontrado.");
    if (resolverModeloRat(chamado) !== "dasa-v1") {
      throw new Error("Novas visitas estão disponíveis somente para chamados DASA.");
    }
    if (chamado.status !== "Concluído" && chamado.status !== "Improdutivo") {
      throw new Error("A nova visita exige um chamado DASA encerrado.");
    }
    return this.gateway.criarVisita(id, validarNovaVisita(entrada));
  }

  async importar(chamado: ChamadoImportacao, nomeArquivo: string) {
    if (await this.gateway.buscarHash(chamado.hash_email)) {
      throw new Error("Este e-mail já foi importado.");
    }
    return this.gateway.importar({ ...chamado, status: "Agendado" }, nomeArquivo);
  }

  async excluir(id: number) {
    if (!Number.isSafeInteger(id) || id <= 0) throw new Error("Chamado inválido.");
    await this.gateway.excluir(id);
  }
}
