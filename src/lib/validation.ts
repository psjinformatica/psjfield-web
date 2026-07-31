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

export function validarAtendimento(input: unknown) {
  return atendimentoSchema.parse(input);
}

export function validarFinalizacao(input: unknown) {
  return finalizacaoSchema.parse(input);
}
