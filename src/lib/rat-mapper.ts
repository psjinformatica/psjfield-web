import { formatarCidade } from "@/lib/format";
import type { AssinaturaCliente } from "@/lib/assinaturas-types";
import type { RatRevisao } from "@/lib/rat-types";
import type { Chamado } from "@/lib/types";

function dataAtendimento(chamado: Chamado) {
  return chamado.data_agendada || "";
}

function tipoEquipamento(valor: string): RatRevisao["tipo_equipamento"] {
  const normalizado = valor.toLocaleLowerCase("pt-BR");
  if (normalizado.includes("notebook")) return "Notebook";
  if (normalizado.includes("desktop")) return "Desktop";
  if (normalizado.includes("monitor")) return "Monitor";
  return valor ? "Outro" : "";
}

export function mapearChamadoParaRat(
  chamado: Chamado,
  cliente: AssinaturaCliente | null,
): RatRevisao {
  const tipo = tipoEquipamento(chamado.equipamento || "");
  return {
    chamado: chamado.numero_chamado || "", data_inicio: dataAtendimento(chamado), hora_inicio: chamado.hora_inicio || chamado.hora_agendada || "",
    data_fim: dataAtendimento(chamado), hora_fim: chamado.hora_termino || "", login: chamado.usuario_responsavel || "",
    colaborador: cliente?.nome_responsavel || chamado.contato || "", telefone: chamado.telefone || "", email: "",
    localidade: [chamado.endereco, formatarCidade(chamado.cidade, chamado.estado)].filter(Boolean).join(" - "),
    tipos_ocorrencia: [], tipo_equipamento: tipo, outro_equipamento: tipo === "Outro" ? chamado.equipamento : "", dominio: "",
    atual_serial: chamado.numero_serie || "", atual_ae: chamado.patrimonio_ae || "", atual_fabricante: chamado.fabricante || "", atual_modelo: chamado.modelo || "",
    atual_processador: "", atual_hd: "", atual_hostname: "", atual_memoria: "",
    novo_serial: "", novo_ae: "", novo_fabricante: "", novo_modelo: "", novo_processador: "", novo_hd: "", novo_hostname: "", novo_memoria: "",
    pasta_perfil_pst: "", software: "", itens_afetados: [], memoria_frequencia: "", item_outros: "", part_number: "", centro_custo: "",
    diagnosticos: [], diagnostico_outros: "", descricao: "",
    status_equipamento: [], condicao_equipamento: "", qualificacao: "", validacoes_finais: [],
    recebido_laboratorio: false, recebido_estoque: false, analista_logistica: "", data_hora_logistica: "",
  };
}
