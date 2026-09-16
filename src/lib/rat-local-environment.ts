export function persistenciaDasaHabilitada(ambiente: NodeJS.ProcessEnv = process.env) {
  return ambiente.RAT_DASA_PERSISTENCE_ENABLED === "1";
}
