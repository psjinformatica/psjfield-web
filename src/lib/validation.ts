import { z } from "zod";

const horario = z
  .string()
  .trim()
  .refine(
    (valor) => valor === "" || /^([01]\d|2[0-3]):[0-5]\d$/.test(valor),
    "Informe o horário no formato HH:MM.",
  );

export const atendimentoSchema = z.object({
  hora_chegada: horario,
  hora_inicio: horario,
  hora_termino: horario,
  descricao_servico: z.string().trim().max(10_000),
  observacoes_atendimento: z.string().trim().max(10_000),
  confirmar_alteracao_hora_inicio: z.boolean().default(false),
});

export const finalizacaoSchema = z.object({
  status: z.enum(["Concluído", "Improdutivo", "Cancelado"]),
  motivo: z.string().trim().max(10_000).default(""),
}).superRefine((dados, contexto) => {
  if ((dados.status === "Improdutivo" || dados.status === "Cancelado") && !dados.motivo) {
    contexto.addIssue({
      code: "custom",
      path: ["motivo"],
      message: `Informe o motivo do status ${dados.status}.`,
    });
  }
});

export const reaberturaSchema = z.object({
  motivo: z.string().trim().min(1, "Informe o motivo da reabertura.").max(10_000),
});

const dataCivil = z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, "Informe uma data válida.")
  .refine((valor) => {
    const [ano, mes, dia] = valor.split("-").map(Number);
    const data = new Date(Date.UTC(ano, mes - 1, dia));
    return data.getUTCFullYear() === ano && data.getUTCMonth() === mes - 1 && data.getUTCDate() === dia;
  }, "Informe uma data válida.");

export const novaVisitaSchema = z.object({
  data_agendada: dataCivil,
  hora_agendada: horario.refine((valor) => valor !== "", "Informe o horário da visita."),
  unidade_nome: z.string().trim().min(1, "Informe a Unidade/Nome.").max(500),
});

export function validarAtendimento(input: unknown) {
  return atendimentoSchema.parse(input);
}

export function validarFinalizacao(input: unknown) {
  return finalizacaoSchema.parse(input);
}

export function validarReabertura(input: unknown) {
  return reaberturaSchema.parse(input);
}

export function validarNovaVisita(input: unknown) {
  return novaVisitaSchema.parse(input);
}
