export async function carregarComplementosChamado<TCliente, TTecnico, TRats>(carregadores: {
  cliente: () => Promise<TCliente>;
  tecnico: () => Promise<TTecnico>;
  rats: () => Promise<TRats>;
}) {
  const assinaturaCliente = await carregadores.cliente();
  const assinaturaTecnico = await carregadores.tecnico();
  const rats = await carregadores.rats();
  return { assinaturaCliente, assinaturaTecnico, rats };
}
