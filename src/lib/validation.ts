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
});

export function validarAtendimento(input: unknown) {
  return atendimentoSchema.parse(input);
}
