import { REGRA_PRECO_ATUAL, type CalculoFinanceiro } from "@/lib/financeiro-types";

const HORARIO = /^([01]\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?$/;

function minutosDoDia(valor: string) {
  const partes = HORARIO.exec(valor.trim());
  return partes ? Number(partes[1]) * 60 + Number(partes[2]) : null;
}

export function calcularFinanceiro(horaInicio: string, horaFim: string): CalculoFinanceiro | null {
  const inicio = minutosDoDia(horaInicio);
  const fim = minutosDoDia(horaFim);
  if (inicio === null || fim === null || fim < inicio) return null;

  const duracaoMinutos = fim - inicio;
  const horasAdicionais = Math.ceil(Math.max(0, duracaoMinutos - 180) / 60);
  const valorBase = 100;
  const valorHoraAdicional = 30;
  const valorAdicional = horasAdicionais * valorHoraAdicional;

  return {
    duracao_minutos: duracaoMinutos,
    horas_adicionais: horasAdicionais,
    valor_base: valorBase,
    valor_hora_adicional: valorHoraAdicional,
    valor_adicional: valorAdicional,
    valor_total: valorBase + valorAdicional,
    regra_preco: REGRA_PRECO_ATUAL,
  };
}
