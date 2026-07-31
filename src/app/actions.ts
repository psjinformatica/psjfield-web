"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { chamadosService } from "@/lib/server-service";

export type ActionState = { sucesso?: string; erro?: string };

export async function salvarAtendimentoAction(
  id: number,
  _estado: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    await chamadosService.atualizar(id, {
      hora_chegada: String(formData.get("hora_chegada") || ""),
      hora_inicio: String(formData.get("hora_inicio") || ""),
      hora_termino: String(formData.get("hora_termino") || ""),
      descricao_servico: String(formData.get("descricao_servico") || ""),
      observacoes_atendimento: String(formData.get("observacoes_atendimento") || ""),
    });
    revalidatePath(`/chamados/${id}`);
    revalidatePath("/");
    return { sucesso: "Atendimento salvo com sucesso." };
  } catch (erro) {
    return { erro: erro instanceof Error ? erro.message : "Não foi possível salvar." };
  }
}

export async function excluirChamadoAction(id: number) {
  await chamadosService.excluir(id);
  revalidatePath("/");
  redirect("/?excluido=1");
}
