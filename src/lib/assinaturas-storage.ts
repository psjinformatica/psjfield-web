import "server-only";

import { createClient } from "@supabase/supabase-js";

import type { ArquivoAssinatura } from "@/lib/assinaturas-types";
import { normalizarSupabaseUrl } from "@/lib/assinaturas-validation";

const BUCKET = "assinaturas";

function variavel(nome: "SUPABASE_URL" | "SUPABASE_SERVICE_ROLE_KEY") {
  const valor = process.env[nome]?.trim();
  if (!valor) throw new Error(`${nome} não configurada no servidor.`);
  return valor;
}

function supabaseUrl() {
  return normalizarSupabaseUrl(variavel("SUPABASE_URL"));
}

const globalSupabase = globalThis as typeof globalThis & {
  psjfieldSupabaseAdmin?: ReturnType<typeof createClient>;
};

function clienteStorage() {
  if (!globalSupabase.psjfieldSupabaseAdmin) {
    globalSupabase.psjfieldSupabaseAdmin = createClient(
      supabaseUrl(),
      variavel("SUPABASE_SERVICE_ROLE_KEY"),
      { auth: { autoRefreshToken: false, persistSession: false } },
    );
  }
  return globalSupabase.psjfieldSupabaseAdmin.storage.from(BUCKET);
}

export async function enviarAssinatura(caminho: string, arquivo: ArquivoAssinatura) {
  const { error } = await clienteStorage().upload(caminho, arquivo.bytes, {
    contentType: arquivo.tipo,
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw new Error(`Não foi possível salvar a assinatura: ${error.message}`);
}

export async function removerAssinatura(caminho: string) {
  if (!caminho) return;
  const { error } = await clienteStorage().remove([caminho]);
  if (error) throw new Error(`Não foi possível remover a assinatura anterior: ${error.message}`);
}

export async function criarUrlTemporaria(caminho: string) {
  const { data, error } = await clienteStorage().createSignedUrl(caminho, 60 * 60);
  if (error || !data?.signedUrl) throw new Error("Não foi possível carregar a assinatura.");
  return data.signedUrl;
}
