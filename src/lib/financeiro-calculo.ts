import {
  type CalculoFinanceiro,
} from "@/lib/financeiro-types";
import {
  resolverParametrosFinanceiros,
  type ParametrosFinanceirosEntrada,
} from "@/lib/financeiro-parametros";

const HORARIO = /^([01]\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?$/;

function minutosDoDia(valor: string) {
  const partes = HORARIO.exec(valor.trim());
  return partes ? Number(partes[1]) * 60 + Number(partes[2]) : null;
}

export function calcularFinanceiro(
  horaInicio: string,
  horaFim: string,
  parametros: ParametrosFinanceirosEntrada = {},
): CalculoFinanceiro | null {
  const inicio = minutosDoDia(horaInicio);
  const fim = minutosDoDia(horaFim);
  if (inicio === null || fim === null || fim < inicio) return null;

  const efetivos = resolverParametrosFinanceiros(parametros);
  const duracaoMinutos = fim - inicio;
  const minutosIncluidos = Math.round(efetivos.horas_incluidas * 60);
  const horasAdicionais = Math.ceil(Math.max(0, duracaoMinutos - minutosIncluidos) / 60);
  const valorBase = efetivos.valor_base;
  const valorHoraAdicional = efetivos.valor_hora_adicional;
  const valorAdicional = horasAdicionais * valorHoraAdicional;

  return {
    duracao_minutos: duracaoMinutos,
    horas_adicionais: horasAdicionais,
    valor_base: valorBase,
    valor_hora_adicional: valorHoraAdicional,
    valor_adicional: valorAdicional,
    valor_total: valorBase + valorAdicional,
    regra_preco: efetivos.regra_preco,
  };
}
