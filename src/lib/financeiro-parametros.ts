import {
  REGRA_PRECO_ATUAL,
  REGRA_PRECO_PERSONALIZADA,
  PARAMETROS_FINANCEIROS_PADRAO,
  type RegraPreco,
} from "@/lib/financeiro-types";

export { PARAMETROS_FINANCEIROS_PADRAO } from "@/lib/financeiro-types";

export type ParametrosFinanceirosEntrada = {
  valor_base?: string | number | null;
  horas_incluidas?: string | number | null;
  valor_hora_adicional?: string | number | null;
};

export type ParametrosFinanceirosEfetivos = {
  valor_base: number;
  horas_incluidas: number;
  valor_hora_adicional: number;
  regra_preco: RegraPreco;
  personalizado: boolean;
};

function numeroNaoNegativo(valor: string | number | null | undefined, campo: string) {
  if (valor === null || valor === undefined || valor === "") return null;
  const numero = typeof valor === "number" ? valor : Number(valor);
  if (!Number.isFinite(numero) || numero < 0) {
    throw new Error(`Parâmetro financeiro inválido: ${campo}.`);
  }
  return numero;
}

export function resolverParametrosFinanceiros(
  entrada: ParametrosFinanceirosEntrada = {},
): ParametrosFinanceirosEfetivos {
  const valorBase = numeroNaoNegativo(entrada.valor_base, "valor_base")
    ?? PARAMETROS_FINANCEIROS_PADRAO.valor_base;
  const horasIncluidas = numeroNaoNegativo(entrada.horas_incluidas, "horas_incluidas")
    ?? PARAMETROS_FINANCEIROS_PADRAO.horas_incluidas;
  const valorHoraAdicional = numeroNaoNegativo(entrada.valor_hora_adicional, "valor_hora_adicional")
    ?? PARAMETROS_FINANCEIROS_PADRAO.valor_hora_adicional;
  const personalizado = valorBase !== PARAMETROS_FINANCEIROS_PADRAO.valor_base
    || horasIncluidas !== PARAMETROS_FINANCEIROS_PADRAO.horas_incluidas
    || valorHoraAdicional !== PARAMETROS_FINANCEIROS_PADRAO.valor_hora_adicional;

  return {
    valor_base: valorBase,
    horas_incluidas: horasIncluidas,
    valor_hora_adicional: valorHoraAdicional,
    regra_preco: personalizado ? REGRA_PRECO_PERSONALIZADA : REGRA_PRECO_ATUAL,
    personalizado,
  };
}
