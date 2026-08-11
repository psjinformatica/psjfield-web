export function nomeArquivoRat(numeroChamado: string, versao: number) {
  const chamado = (numeroChamado || "chamado")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "");
  const sufixo = versao > 1 ? `_v${versao}` : "";
  return `RAT_${chamado || "chamado"}${sufixo}.pdf`;
}
