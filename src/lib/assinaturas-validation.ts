import { z } from "zod";

import type { ArquivoAssinatura } from "@/lib/assinaturas-types";

export const TAMANHO_MAXIMO_ASSINATURA = 2 * 1024 * 1024;

const responsavelSchema = z.object({
  nome_responsavel: z.string().trim().min(2, "Informe o nome do responsável.").max(160),
  documento_responsavel: z.string().trim().max(80),
});

const tecnicoSchema = z.object({
  nome_tecnico: z.string().trim().min(2, "Informe o nome do técnico.").max(160),
});

export function validarResponsavel(entrada: unknown) {
  const resultado = responsavelSchema.safeParse(entrada);
  if (!resultado.success) throw new Error(resultado.error.issues[0]?.message || "Dados inválidos.");
  return resultado.data;
}

export function validarTecnico(entrada: unknown) {
  const resultado = tecnicoSchema.safeParse(entrada);
  if (!resultado.success) throw new Error(resultado.error.issues[0]?.message || "Dados inválidos.");
  return resultado.data;
}

export function validarArquivoAssinatura(arquivo: ArquivoAssinatura) {
  if (arquivo.tipo !== "image/png") throw new Error("A assinatura deve estar no formato PNG.");
  if (!arquivo.tamanho || arquivo.tamanho > TAMANHO_MAXIMO_ASSINATURA) {
    throw new Error("A assinatura deve ter no máximo 2 MB.");
  }
  const cabecalhoPng = [137, 80, 78, 71, 13, 10, 26, 10];
  if (arquivo.bytes.length < cabecalhoPng.length || cabecalhoPng.some((byte, indice) => arquivo.bytes[indice] !== byte)) {
    throw new Error("O arquivo de assinatura não é um PNG válido.");
  }
  return arquivo;
}

export function normalizarSupabaseUrl(valor: string) {
  try {
    const url = new URL(valor);
    if (url.protocol !== "https:" || !url.hostname.endsWith(".supabase.co")) throw new Error();
    return url.origin;
  } catch {
    throw new Error("SUPABASE_URL inválida no servidor.");
  }
}
