import "server-only";

import { createClient } from "@supabase/supabase-js";

import { normalizarSupabaseUrl } from "@/lib/assinaturas-validation";

function variavel(nome: "SUPABASE_URL" | "SUPABASE_SERVICE_ROLE_KEY") {
  const valor = process.env[nome]?.trim();
  if (!valor) throw new Error(`${nome} não configurada no servidor.`);
  return valor;
}

const globalRatStorage = globalThis as typeof globalThis & { psjfieldRatSupabase?: ReturnType<typeof createClient> };

function cliente() {
  if (!globalRatStorage.psjfieldRatSupabase) {
    globalRatStorage.psjfieldRatSupabase = createClient(
      normalizarSupabaseUrl(variavel("SUPABASE_URL")),
      variavel("SUPABASE_SERVICE_ROLE_KEY"),
      { auth: { autoRefreshToken: false, persistSession: false } },
    );
  }
  return globalRatStorage.psjfieldRatSupabase;
}

export async function baixarArquivo(bucket: string, caminho: string) {
  const { data, error } = await cliente().storage.from(bucket).download(caminho);
  if (error || !data) throw new Error("Não foi possível carregar arquivo privado para a RAT.");
  return new Uint8Array(await data.arrayBuffer());
}

export async function enviarRat(caminho: string, bytes: Uint8Array) {
  const { error } = await cliente().storage.from("rats").upload(caminho, bytes, {
    contentType: "application/pdf", cacheControl: "3600", upsert: false,
  });
  if (error) throw new Error(`Não foi possível armazenar a RAT: ${error.message}`);
}

export async function removerRat(caminho: string) {
  const { error } = await cliente().storage.from("rats").remove([caminho]);
  if (error) throw new Error(`Não foi possível remover a RAT incompleta: ${error.message}`);
}

export function baixarRat(caminho: string) {
  return baixarArquivo("rats", caminho);
}
