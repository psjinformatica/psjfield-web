export type ChamadoResumo = {
  id: number;
  numero_chamado: string;
  status: string;
  data_agendada: string;
  hora_agendada: string;
  cliente: string;
  projeto: string;
  cidade: string;
  estado: string;
  atividade: string;
  valor_base: string | null;
};

export type Chamado = ChamadoResumo & {
  empresa_parceira: string;
  assunto_email: string;
  remetente: string;
  destinatario: string;
  data_email: string;
  usuario_responsavel: string;
  contato: string;
  telefone: string;
  endereco: string;
  descricao: string;
  equipamento: string;
  fabricante: string;
  modelo: string;
  patrimonio_ae: string;
  numero_serie: string;
  horas_incluidas: string | null;
  valor_hora_adicional: string | null;
  observacoes: string;
  hora_chegada: string;
  hora_inicio: string;
  hora_termino: string;
  descricao_servico: string;
  observacoes_atendimento: string;
};

export type AtendimentoInput = {
  hora_chegada: string;
  hora_inicio: string;
  hora_termino: string;
  descricao_servico: string;
  observacoes_atendimento: string;
  confirmar_alteracao_hora_inicio: boolean;
};

export type AtendimentoAtualizado = {
  status: string;
  hora_inicio: string;
};

export type StatusFinalizacao = "Concluído" | "Improdutivo" | "Cancelado";

export type FinalizacaoInput = {
  status: StatusFinalizacao;
  motivo: string;
};

export type ChamadoFinalizado = {
  status: StatusFinalizacao;
  hora_termino: string;
  gera_recebimento: boolean;
};

export type ReaberturaInput = {
  motivo: string;
};

export type ChamadoReaberto = {
  status: "Em atendimento";
  reaberto_em: string;
};

export type ChamadoImportacao = Omit<
  Chamado,
  | "id"
  | "hora_chegada"
  | "hora_inicio"
  | "hora_termino"
  | "descricao_servico"
  | "observacoes_atendimento"
> & {
  caminho_email: string;
  hash_email: string;
  corpo_email: string;
  criado_em: string;
  atualizado_em: string;
};

export type PreviaImportacao = {
  chamado: ChamadoImportacao;
  reconhecidoGrupoEasy: boolean;
  nomeArquivo: string;
};

export type ChamadoDuplicado = {
  chamado_id: number;
  numero_chamado: string;
  cliente: string;
  cidade: string;
  estado: string;
  importado_em: string;
};
