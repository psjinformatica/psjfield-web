import { z } from "zod";

import type { RegraPreco } from "@/lib/financeiro-types";

const parametroFinanceiro = z.coerce.number()
  .finite("Informe um valor numérico válido.")
  .nonnegative("Informe um valor não negativo.");

export const parametrosCorrecaoFinanceiraSchema = z.object({
  valor_base: parametroFinanceiro,
  horas_incluidas: parametroFinanceiro,
  valor_hora_adicional: parametroFinanceiro,
}).strict();

export const previaCorrecaoFinanceiraSchema = z.object({
  parametros: parametrosCorrecaoFinanceiraSchema,
}).strict();

export const aplicarCorrecaoFinanceiraSchema = previaCorrecaoFinanceiraSchema.extend({
  motivo: z.string().trim().min(3, "Informe o motivo da correção.").max(1_000),
  confirmado: z.literal(true, "Confirme explicitamente a correção."),
  versao: z.string().regex(/^[a-f0-9]{64}$/, "A prévia financeira expirou."),
}).strict();

export type ParametrosCorrecaoFinanceira = z.infer<typeof parametrosCorrecaoFinanceiraSchema>;

export type ValoresCorrecaoFinanceira = ParametrosCorrecaoFinanceira & {
  horas_adicionais: number;
  valor_adicional: number;
  valor_total: number;
  regra_preco: RegraPreco;
};

export type PreviaCorrecaoFinanceira = {
  conta_id: string;
  chamado_id: number;
  numero_chamado: string;
  situacao: "A_RECEBER";
  previsao_recebimento: string;
  duracao_minutos: number;
  atual: ValoresCorrecaoFinanceira;
  novo: ValoresCorrecaoFinanceira;
  alteracoes: Array<{ campo: string; rotulo: string; anterior: string; novo: string }>;
  versao: string;
};

export class ConflitoCorrecaoFinanceiraError extends Error {
  constructor(mensagem = "O recebível foi alterado em outra tela. Recarregue e gere uma nova prévia.") {
    super(mensagem);
    this.name = "ConflitoCorrecaoFinanceiraError";
  }
}
