import type { ChamadoImportacao } from "@/lib/types";

export const CAMPOS_IMPORTACAO_EDITAVEIS = [
  "numero_chamado", "cliente", "projeto", "data_agendada", "hora_agendada",
  "contato", "telefone", "unidade_nome", "endereco", "cidade", "estado",
  "atividade", "descricao", "equipamento", "fabricante", "modelo",
  "patrimonio_ae", "numero_serie", "valor_base", "horas_incluidas",
  "valor_hora_adicional", "observacoes",
] as const satisfies readonly (keyof ChamadoImportacao)[];

export const CAMPOS_PREVIEW_IMPORTACAO = [
  ["numero_chamado", "Número do chamado"],
  ["cliente", "Cliente"],
  ["projeto", "Projeto"],
  ["data_agendada", "Data"],
  ["hora_agendada", "Hora"],
  ["contato", "Contato"],
  ["telefone", "Telefone"],
  ["unidade_nome", "Unidade/Nome"],
  ["endereco", "Endereço"],
  ["cidade", "Cidade"],
  ["estado", "UF"],
  ["atividade", "Atividade"],
  ["equipamento", "Equipamento"],
  ["fabricante", "Fabricante"],
  ["modelo", "Modelo"],
  ["numero_serie", "Número de série"],
  ["patrimonio_ae", "AE"],
  ["valor_base", "Valor base"],
  ["valor_hora_adicional", "Hora adicional"],
] as const satisfies readonly (readonly [keyof ChamadoImportacao, string])[];

export function aplicarRevisaoImportacao(
  original: ChamadoImportacao,
  dados: Record<string, unknown>,
): ChamadoImportacao {
  const revisado = { ...original };
  for (const campo of CAMPOS_IMPORTACAO_EDITAVEIS) {
    const valor = dados[campo];
    if (typeof valor === "string" || valor === null) {
      Object.assign(revisado, { [campo]: valor });
    }
  }
  return revisado;
}
