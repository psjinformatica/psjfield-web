export type ArquivoAssinatura = {
  bytes: Uint8Array;
  tipo: string;
  tamanho: number;
};

export type AssinaturaClienteInput = {
  nome_responsavel: string;
  documento_responsavel: string;
  arquivo: ArquivoAssinatura;
};

export type AssinaturaTecnicoInput = {
  nome_tecnico: string;
  arquivo: ArquivoAssinatura;
};

export type AssinaturaCliente = {
  chamado_id: number;
  nome_responsavel: string;
  documento_responsavel: string;
  caminho_assinatura: string;
  assinado_em: string;
  atualizado_em: string;
};

export type AssinaturaTecnico = {
  id: number;
  nome_tecnico: string;
  caminho_assinatura: string;
  atualizado_em: string;
};

export type AssinaturaVisualizacao<T> = T & { assinatura_url: string };
