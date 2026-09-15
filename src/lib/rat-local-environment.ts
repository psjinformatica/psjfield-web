function hostLocal(valor: string | undefined) {
  const texto = valor?.trim();
  if (!texto) return false;
  if (/\bhost\s*=\s*(localhost|127\.0\.0\.1|::1)\b/i.test(texto)) return true;
  try {
    const host = new URL(texto).hostname.replace(/^\[|\]$/g, "");
    return host === "localhost" || host === "127.0.0.1" || host === "::1";
  } catch {
    return false;
  }
}

export function persistenciaDasaLocalHabilitada(ambiente: NodeJS.ProcessEnv = process.env) {
  return ambiente.NODE_ENV !== "production"
    && ambiente.RAT_DASA_LOCAL_PERSISTENCE === "1"
    && hostLocal(ambiente.DATABASE_URL)
    && hostLocal(ambiente.SUPABASE_URL);
}
