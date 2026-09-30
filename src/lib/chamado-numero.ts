export const PADRAO_NUMERO_CHAMADO = /^(?:(?:MI|SR)-\d+(?:-\d+)?|INC-\d+)$/i;

export const PADRAO_NUMERO_CHAMADO_HTML = "(?:(?:MI|SR)-[0-9]+(?:-[0-9]+)?|INC-[0-9]+)";

export const MENSAGEM_NUMERO_CHAMADO_INVALIDO =
  "Número do chamado inválido. Use MI-123, MI-123-2, SR-123 ou INC-123.";

const PADRAO_NUMERO_CHAMADO_EM_TEXTO = /\b(?:(?:MI|SR)-\d+(?:-\d+)?|INC-\d+(?!-\d))\b/i;

export function numeroChamadoValido(valor: string): boolean {
  return PADRAO_NUMERO_CHAMADO.test(valor.trim());
}

export function extrairNumeroChamado(valor: string): string {
  return valor.match(PADRAO_NUMERO_CHAMADO_EM_TEXTO)?.[0].toUpperCase() || "";
}
