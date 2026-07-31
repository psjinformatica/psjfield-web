import "server-only";

import { ChamadosService, type ChamadosGateway } from "@/lib/chamados-service";
import {
  atualizarAtendimento,
  buscarChamado,
  buscarPorHash,
  excluirChamado,
  importarChamado,
  listarChamados,
} from "@/lib/repository";

const gateway: ChamadosGateway = {
  listar: listarChamados,
  buscar: buscarChamado,
  atualizar: atualizarAtendimento,
  buscarHash: buscarPorHash,
  importar: importarChamado,
  excluir: excluirChamado,
};

export const chamadosService = new ChamadosService(gateway);
