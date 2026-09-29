export type ReferenciaVisita = {
  id: number;
  chamado_raiz_id: number | null;
};

export function obterChamadoRaizId(chamado: ReferenciaVisita) {
  return chamado.chamado_raiz_id ?? chamado.id;
}

export function exibirIdentificacaoVisita(quantidadeVisitas?: number) {
  return (quantidadeVisitas ?? 1) > 1;
}

export function rotuloVisita(visitaNumero: number) {
  return `Visita ${visitaNumero}`;
}
