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
  ReaberturaInput,
} from "@/lib/types";
import { validarAtendimento, validarFinalizacao, validarReabertura } from "@/lib/validation";

export interface ChamadosGateway {
  listar(): Promise<ChamadoResumo[]>;
  buscar(id: number): Promise<Chamado | null>;
  atualizar(id: number, dados: AtendimentoInput): Promise<AtendimentoAtualizado>;
  finalizar(id: number, dados: FinalizacaoInput): Promise<ChamadoFinalizado>;
  reabrir(id: number, dados: ReaberturaInput): Promise<ChamadoReaberto>;
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
