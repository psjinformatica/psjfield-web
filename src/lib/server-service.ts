import "server-only";

import { ChamadosService, type ChamadosGateway } from "@/lib/chamados-service";
import {
  atualizarAtendimento,
  buscarChamado,
  buscarPorHash,
  criarNovaVisita,
  excluirChamado,
  finalizarChamado,
  importarChamado,
  listarChamados,
  listarVisitasChamado,
  marcarChamadoVisualizado,
  reabrirChamado,
} from "@/lib/repository";

const gateway: ChamadosGateway = {
  listar: listarChamados,
  buscar: buscarChamado,
  listarVisitas: listarVisitasChamado,
  marcarVisualizado: marcarChamadoVisualizado,
  atualizar: atualizarAtendimento,
  finalizar: finalizarChamado,
  reabrir: reabrirChamado,
  criarVisita: criarNovaVisita,
  buscarHash: buscarPorHash,
  importar: importarChamado,
  excluir: excluirChamado,
};

export const chamadosService = new ChamadosService(gateway);
