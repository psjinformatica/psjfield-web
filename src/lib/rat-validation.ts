import { z } from "zod";

import { CONDICOES_EQUIPAMENTO, DIAGNOSTICOS, ITENS_AFETADOS, STATUS_EQUIPAMENTO, TIPOS_EQUIPAMENTO, TIPOS_OCORRENCIA, VALIDACOES_FINAIS } from "@/lib/rat-types";

const texto = z.string().trim().max(5_000).default("");
const lista = (opcoes: readonly string[]) => z.array(z.string()).default([]).transform((itens) => itens.filter((item) => opcoes.includes(item)));

export const ratRevisaoSchema = z.object({
  chamado: texto, data_inicio: texto, hora_inicio: texto, data_fim: texto, hora_fim: texto,
  login: texto, colaborador: texto, telefone: texto, email: texto, localidade: texto,
  tipos_ocorrencia: lista(TIPOS_OCORRENCIA), tipo_equipamento: z.enum(TIPOS_EQUIPAMENTO).or(z.literal("")).default(""), outro_equipamento: texto, dominio: texto,
  atual_serial: texto, atual_ae: texto, atual_fabricante: texto, atual_modelo: texto,
  atual_processador: texto, atual_hd: texto, atual_hostname: texto, atual_memoria: texto,
  novo_serial: texto, novo_ae: texto, novo_fabricante: texto, novo_modelo: texto,
  novo_processador: texto, novo_hd: texto, novo_hostname: texto, novo_memoria: texto,
  pasta_perfil_pst: texto, software: texto, itens_afetados: lista(ITENS_AFETADOS), memoria_frequencia: texto, item_outros: texto,
  part_number: texto, centro_custo: texto, diagnosticos: lista(DIAGNOSTICOS), diagnostico_outros: texto,
  descricao: texto, status_equipamento: lista(STATUS_EQUIPAMENTO), condicao_equipamento: z.enum(CONDICOES_EQUIPAMENTO).or(z.literal("")).default(""),
  qualificacao: texto, validacoes_finais: lista(VALIDACOES_FINAIS),
  recebido_laboratorio: z.boolean().default(false), recebido_estoque: z.boolean().default(false),
  analista_logistica: texto, data_hora_logistica: texto,
});

export function validarRatRevisao(entrada: unknown) {
  return ratRevisaoSchema.parse(entrada);
}
