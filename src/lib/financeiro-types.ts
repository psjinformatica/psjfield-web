export const REGRA_PRECO_ATUAL = "BASE_100_3H_ADICIONAL_30_V1";
export const REGRA_PRECO_PERSONALIZADA = "PARAMETROS_CHAMADO_V1";
export const PARAMETROS_FINANCEIROS_PADRAO = {
  valor_base: 100,
  horas_incluidas: 3,
  valor_hora_adicional: 30,
} as const;
export const VALOR_BASE_ATUAL = PARAMETROS_FINANCEIROS_PADRAO.valor_base;

export type RegraPreco = typeof REGRA_PRECO_ATUAL | typeof REGRA_PRECO_PERSONALIZADA;

export type SituacaoFinanceira = "A_RECEBER" | "EM_REVISAO" | "RECEBIDO";
export type OrigemFinanceira = "AUTOMATICO" | "HISTORICO_MANUAL";

export type CalculoFinanceiro = {
  duracao_minutos: number;
  horas_adicionais: number;
  valor_base: number;
  valor_hora_adicional: number;
  valor_adicional: number;
  valor_total: number;
  regra_preco: RegraPreco;
};

export type ContaReceber = {
  id: string;
  chamado_id: number;
  numero_chamado: string;
  visita_numero?: number;
  quantidade_visitas?: number;
  encerrado_em: string;
  hora_inicio_snapshot: string;
  hora_fim_snapshot: string;
  duracao_minutos: number | null;
  horas_adicionais: number | null;
  valor_base: string;
  horas_incluidas: string;
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
