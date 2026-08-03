import "server-only";

import { ChamadosService, type ChamadosGateway } from "@/lib/chamados-service";
import {
  atualizarAtendimento,
  buscarChamado,
  buscarPorHash,
  excluirChamado,
  finalizarChamado,
  importarChamado,
  listarChamados,
  reabrirChamado,
} from "@/lib/repository";

const gateway: ChamadosGateway = {
  listar: listarChamados,
  buscar: buscarChamado,
  atualizar: atualizarAtendimento,
  finalizar: finalizarChamado,
  reabrir: reabrirChamado,
  buscarHash: buscarPorHash,
  importar: importarChamado,
  excluir: excluirChamado,
};

export const chamadosService = new ChamadosService(gateway);
