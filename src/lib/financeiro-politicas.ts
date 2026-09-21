import { calcularFinanceiro } from "@/lib/financeiro-calculo";
import { REGRA_PRECO_ATUAL, type CalculoFinanceiro } from "@/lib/financeiro-types";
import { normalizarClienteRat, resolverModeloRat } from "@/lib/rat-models";

export type ClienteFinanceiro = "claro" | "dasa";

export type PoliticaFinanceira = {
  cliente: ClienteFinanceiro;
  regra_previsao: "CORTE_26_25_DIA_15" | "MES_CALENDARIO_DIA_15";
  regra_valor: typeof REGRA_PRECO_ATUAL;
};

export type RecebivelAutomatico = {
  calculo: CalculoFinanceiro | null;
  previsao_recebimento: string;
  prazo_dias: number;
};

const CLIENTES_CLARO = new Set([
  "claro",
  "claro brasil",
  "claro brasil sa",
  "claro brasil s a",
]);

const POLITICAS: Record<ClienteFinanceiro, PoliticaFinanceira> = {
  claro: {
    cliente: "claro",
    regra_previsao: "CORTE_26_25_DIA_15",
    regra_valor: REGRA_PRECO_ATUAL,
  },
  dasa: {
    cliente: "dasa",
    regra_previsao: "MES_CALENDARIO_DIA_15",
    regra_valor: REGRA_PRECO_ATUAL,
  },
};

type PartesData = { ano: number; mes: number; dia: number };

function dataValida(ano: number, mes: number, dia: number) {
  const data = new Date(Date.UTC(ano, mes - 1, dia));
  return data.getUTCFullYear() === ano && data.getUTCMonth() === mes - 1 && data.getUTCDate() === dia;
}

function partesDataSaoPaulo(valor: string | Date): PartesData | null {
  if (typeof valor === "string") {
    const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(valor.trim());
    if (partes) {
      const [, ano, mes, dia] = partes.map(Number);
      return dataValida(ano, mes, dia) ? { ano, mes, dia } : null;
    }
  }

  const data = valor instanceof Date ? valor : new Date(valor);
  if (Number.isNaN(data.getTime())) return null;
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(data);
  const numero = (tipo: Intl.DateTimeFormatPartTypes) => Number(partes.find((parte) => parte.type === tipo)?.value);
  return { ano: numero("year"), mes: numero("month"), dia: numero("day") };
}

function dataDia15(ano: number, mes: number, mesesAdiante: number) {
  const data = new Date(Date.UTC(ano, mes - 1 + mesesAdiante, 15));
  return [
    String(data.getUTCFullYear()).padStart(4, "0"),
    String(data.getUTCMonth() + 1).padStart(2, "0"),
    "15",
  ].join("-");
}

export function resolverPoliticaFinanceira(cliente: string | null | undefined): PoliticaFinanceira | null {
  const normalizado = normalizarClienteRat(cliente);
  if (CLIENTES_CLARO.has(normalizado)) return POLITICAS.claro;
  if (resolverModeloRat({ cliente: cliente || "" }) === "dasa-v1") return POLITICAS.dasa;
  return null;
}

export function calcularPrevisaoRecebimento(
  cliente: string | null | undefined,
  dataEncerramento: string | Date,
): string | null {
  const politica = resolverPoliticaFinanceira(cliente);
  const data = partesDataSaoPaulo(dataEncerramento);
  if (!politica || !data) return null;

  if (politica.cliente === "claro") {
    return dataDia15(data.ano, data.mes, data.dia <= 25 ? 1 : 2);
  }
  return dataDia15(data.ano, data.mes, 1);
}

export function calcularValorAtendimento(
  cliente: string | null | undefined,
  horaInicio: string,
  horaFim: string,
): CalculoFinanceiro | null {
  const politica = resolverPoliticaFinanceira(cliente);
  if (politica?.regra_valor !== REGRA_PRECO_ATUAL) return null;
  return calcularFinanceiro(horaInicio, horaFim);
}

export function calcularPrazoAtePrevisao(dataEncerramento: string | Date, previsao: string): number | null {
  const encerramento = partesDataSaoPaulo(dataEncerramento);
  const destino = partesDataSaoPaulo(previsao);
  if (!encerramento || !destino) return null;
  const origemMs = Date.UTC(encerramento.ano, encerramento.mes - 1, encerramento.dia);
  const destinoMs = Date.UTC(destino.ano, destino.mes - 1, destino.dia);
  return Math.round((destinoMs - origemMs) / 86_400_000);
}

export function prepararRecebivelAutomatico(
  cliente: string | null | undefined,
  dataEncerramento: string | Date,
  horaInicio: string,
  horaFim: string,
): RecebivelAutomatico | null {
  const previsao = calcularPrevisaoRecebimento(cliente, dataEncerramento);
  const politica = resolverPoliticaFinanceira(cliente);
  const prazoDias = previsao ? calcularPrazoAtePrevisao(dataEncerramento, previsao) : null;
  if (!previsao || politica?.regra_valor !== REGRA_PRECO_ATUAL || prazoDias === null) {
    return null;
  }
  const calculo = calcularFinanceiro(horaInicio, horaFim);
  return { calculo, previsao_recebimento: previsao, prazo_dias: prazoDias };
}
