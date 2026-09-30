import type { ChamadoImportacao } from "@/lib/types";
import { MENSAGEM_NUMERO_CHAMADO_INVALIDO, numeroChamadoValido } from "@/lib/chamado-numero";

export const CAMPOS_IMPORTACAO_EDITAVEIS = [
  "numero_chamado", "cliente", "projeto", "data_agendada", "hora_agendada",
  "usuario_responsavel", "contato", "telefone", "unidade_nome", "endereco", "cidade", "estado",
  "atividade", "descricao", "equipamento", "fabricante", "modelo",
  "patrimonio_ae", "numero_serie", "valor_base", "horas_incluidas",
  "valor_hora_adicional", "observacoes",
] as const satisfies readonly (keyof ChamadoImportacao)[];

export const CAMPOS_PREVIEW_IMPORTACAO = [
  ["numero_chamado", "Número do chamado"],
  ["cliente", "Cliente"],
  ["projeto", "Projeto"],
  ["data_agendada", "Data agendada"],
  ["hora_agendada", "Hora agendada"],
  ["usuario_responsavel", "Usuário responsável/Login"],
  ["contato", "Solicitante/Contato"],
  ["telefone", "Telefone"],
  ["unidade_nome", "Unidade/Nome"],
  ["endereco", "Endereço"],
  ["cidade", "Cidade"],
  ["estado", "UF"],
  ["atividade", "Atividade/Defeito/Solicitação"],
  ["equipamento", "Equipamento"],
  ["fabricante", "Fabricante"],
  ["modelo", "Modelo"],
  ["numero_serie", "Número de série"],
  ["patrimonio_ae", "Patrimônio/AE"],
  ["valor_base", "Valor base"],
  ["horas_incluidas", "Horas incluídas"],
  ["valor_hora_adicional", "Hora adicional"],
] as const satisfies readonly (readonly [keyof ChamadoImportacao, string])[];

export function aplicarRevisaoImportacao(
  original: ChamadoImportacao,
  dados: Record<string, unknown>,
): ChamadoImportacao {
  const revisado = { ...original };
  for (const campo of CAMPOS_IMPORTACAO_EDITAVEIS) {
    if (!Object.prototype.hasOwnProperty.call(dados, campo)) continue;
    const valor = dados[campo];
    if (typeof valor !== "string" && valor !== null) {
      throw new Error(`Valor inválido no campo ${campo}.`);
    }
    Object.assign(revisado, { [campo]: valor });
  }
  return revisado;
}

export function validarRevisaoImportacao(
  original: ChamadoImportacao,
  dados: Record<string, unknown>,
): ChamadoImportacao {
  const revisado = aplicarRevisaoImportacao(original, dados);
  const numero = revisado.numero_chamado.trim();
  if (numero && !numeroChamadoValido(numero)) {
    throw new Error(MENSAGEM_NUMERO_CHAMADO_INVALIDO);
  }
  if (revisado.estado && !/^[A-Za-z]{2}$/.test(revisado.estado.trim())) {
    throw new Error("UF inválida. Informe duas letras.");
  }
  if (revisado.data_agendada && !/^\d{4}-\d{2}-\d{2}$/.test(revisado.data_agendada)) {
    throw new Error("Data agendada inválida.");
  }
  if (revisado.hora_agendada && !/^([01]\d|2[0-3]):[0-5]\d$/.test(revisado.hora_agendada)) {
    throw new Error("Hora agendada inválida.");
  }
  for (const campo of ["valor_base", "horas_incluidas", "valor_hora_adicional"] as const) {
    if (revisado[campo] === "") revisado[campo] = null;
    const valor = revisado[campo];
    if (valor !== null && (!/^\d+(?:\.\d+)?$/.test(valor) || !Number.isFinite(Number(valor)))) {
      throw new Error(`Valor inválido no campo ${campo}.`);
    }
  }
  return revisado;
}
