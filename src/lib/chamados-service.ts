import type { AtendimentoInput, Chamado, ChamadoImportacao, ChamadoResumo } from "@/lib/types";
import { validarAtendimento } from "@/lib/validation";

export interface ChamadosGateway {
  listar(): Promise<ChamadoResumo[]>;
  buscar(id: number): Promise<Chamado | null>;
  atualizar(id: number, dados: AtendimentoInput): Promise<void>;
  buscarHash(hash: string): Promise<{ chamado_id: number } | null>;
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
    await this.gateway.atualizar(id, validarAtendimento(entrada));
  }

  async importar(chamado: ChamadoImportacao, nomeArquivo: string) {
    if (await this.gateway.buscarHash(chamado.hash_email)) {
      throw new Error("Este e-mail já foi importado.");
    }
    return this.gateway.importar(chamado, nomeArquivo);
  }

  async excluir(id: number) {
    if (!Number.isSafeInteger(id) || id <= 0) throw new Error("Chamado inválido.");
    await this.gateway.excluir(id);
  }
}
