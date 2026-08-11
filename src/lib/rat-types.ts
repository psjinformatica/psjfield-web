export const TIPOS_OCORRENCIA = ["Instalação", "Substituição", "Devolução", "Formatação", "Empréstimo", "Manutenção", "Laudo"] as const;
export const TIPOS_EQUIPAMENTO = ["Notebook", "Desktop", "Monitor", "Outro"] as const;
export const ITENS_AFETADOS = ["HD/SSD", "Placa Mãe", "Touchpad", "S.O.", "Memória/Frequência", "Carcaça", "Teclado", "App/Software", "Tela/TV", "Outros"] as const;
export const DIAGNOSTICOS = ["Sobrecarga", "Impacto ou Queda", "Configuração", "Não Liga/Queimado", "Intervenção não autorizada", "Instalação de SW", "Peça ou Componente Danificado", "Contato com Líquido", "Upgrade/Troca", "Outros"] as const;
export const STATUS_EQUIPAMENTO = ["Equipamento OK", "Desgaste Natural", "Fora de Garantia"] as const;
export const CONDICOES_EQUIPAMENTO = ["Disponível para o uso", "Inoperante"] as const;
export const VALIDACOES_FINAIS = ["Hostname Padronizado", "SCCM/Central de Software", "Configuração de Impressora", "VPN", "Mapeamento de Rede", "E-mail", "M365"] as const;

export type RatRevisao = {
  chamado: string; data_inicio: string; hora_inicio: string; data_fim: string; hora_fim: string;
  login: string; colaborador: string; telefone: string; email: string; localidade: string;
  tipos_ocorrencia: string[]; tipo_equipamento: string; outro_equipamento: string; dominio: string;
  atual_serial: string; atual_ae: string; atual_fabricante: string; atual_modelo: string;
  atual_processador: string; atual_hd: string; atual_hostname: string; atual_memoria: string;
  novo_serial: string; novo_ae: string; novo_fabricante: string; novo_modelo: string;
  novo_processador: string; novo_hd: string; novo_hostname: string; novo_memoria: string;
  pasta_perfil_pst: string; software: string; itens_afetados: string[]; memoria_frequencia: string;
  item_outros: string; part_number: string; centro_custo: string; diagnosticos: string[]; diagnostico_outros: string;
  descricao: string; status_equipamento: string[]; condicao_equipamento: string;
  qualificacao: string; validacoes_finais: string[];
  recebido_laboratorio: boolean; recebido_estoque: boolean; analista_logistica: string; data_hora_logistica: string;
};

export type RatAssinaturas = {
  gerado_em?: string;
  cliente?: { nome: string; documento: string; assinado_em: string; bytes: Uint8Array };
  tecnico?: { nome: string; assinado_em: string; bytes: Uint8Array };
};

export type RatRegistro = {
  id: string; chamado_id: number; versao: number; caminho_pdf: string; hash_pdf: string;
  tecnico: string; status_rat: string; atual: boolean; gerado_em: string; dados_revisao: RatRevisao;
};
