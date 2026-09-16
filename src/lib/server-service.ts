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
  marcarChamadoVisualizado,
  reabrirChamado,
} from "@/lib/repository";

const gateway: ChamadosGateway = {
  listar: listarChamados,
  buscar: buscarChamado,
  marcarVisualizado: marcarChamadoVisualizado,
  atualizar: atualizarAtendimento,
  finalizar: finalizarChamado,
  reabrir: reabrirChamado,
  buscarHash: buscarPorHash,
  importar: importarChamado,
  excluir: excluirChamado,
};

export const chamadosService = new ChamadosService(gateway);
