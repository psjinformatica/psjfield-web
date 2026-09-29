export function nomeArquivoRat(numeroChamado: string, versao: number, visitaNumero = 1) {
  const chamado = (numeroChamado || "chamado")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "");
  const visita = visitaNumero > 1 ? `_Visita-${visitaNumero}` : "";
  const versaoRat = versao > 1 ? `_v${versao}` : "";
  return `RAT_${chamado || "chamado"}${visita}${versaoRat}.pdf`;
}
