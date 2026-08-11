export const REGRA_PRECO_ATUAL = "BASE_100_3H_ADICIONAL_30_V1";

export type SituacaoFinanceira = "A_RECEBER" | "EM_REVISAO" | "RECEBIDO";
export type OrigemFinanceira = "AUTOMATICO" | "HISTORICO_MANUAL";

export type CalculoFinanceiro = {
  duracao_minutos: number;
  horas_adicionais: number;
  valor_base: number;
  valor_hora_adicional: number;
  valor_adicional: number;
  valor_total: number;
  regra_preco: typeof REGRA_PRECO_ATUAL;
};

export type ContaReceber = {
  id: string;
  chamado_id: number;
  numero_chamado: string;
  encerrado_em: string;
  hora_inicio_snapshot: string;
  hora_fim_snapshot: string;
  duracao_minutos: number | null;
  horas_adicionais: number | null;
  valor_base: string;
  valor_hora_adicional: string;
  valor_adicional: string | null;
  valor_total: string | null;
  regra_preco: string;
  origem: OrigemFinanceira;
  prazo_dias: number;
  previsao_recebimento: string;
  situacao: SituacaoFinanceira;
  rotulo_situacao: string;
  revisao_pendente: boolean;
  recebido_em: string | null;
  valor_recebido: string | null;
  observacoes: string;
};
