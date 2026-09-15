export const TIPOS_ATENDIMENTO_DASA = [
  "FIELD_SERVICES",
  "REMOTE_HANDS",
  "RDM",
  "PROJETO",
] as const;

export const TIPOS_EQUIPAMENTO_DASA = [
  "Desktop",
  "Monitor",
  "Etiquetadora",
  "SRX",
  "Notebook",
  "Impressora",
  "Ponto de Rede",
  "Servidor",
  "Outro",
] as const;

export const MOTIVOS_LAUDO_DASA = [
  "COM_DEFEITO",
  "MAU_USO",
  "OBSOLETO",
  "DESCARTE",
] as const;

export const AVALIACOES_DASA = ["BOM", "REGULAR", "RUIM"] as const;

export const ORIGENS_UNIDADE_DASA = [
  "EQUIPAMENTO_SUGERIDO",
  "INFORMADO",
  "NAO_IDENTIFICADA",
] as const;

export type TipoAtendimentoDasa = (typeof TIPOS_ATENDIMENTO_DASA)[number];
export type TipoEquipamentoDasa = (typeof TIPOS_EQUIPAMENTO_DASA)[number];
export type MotivoLaudoDasa = (typeof MOTIVOS_LAUDO_DASA)[number];
export type AvaliacaoDasa = (typeof AVALIACOES_DASA)[number];
export type OrigemUnidadeDasa = (typeof ORIGENS_UNIDADE_DASA)[number];

export type ChecklistAplicadoDasa = {
  energia: boolean;
  cabo_video: boolean;
  demais_perifericos: boolean;
  rede_rj45: boolean;
  system_center: boolean;
  antivirus: boolean;
  limpeza_temporarios: boolean;
  ativacao_windows_office: boolean;
  hostname_correto: boolean;
  problema_reincidente: boolean;
};

export type ChecklistFormatacaoAntesDasa = {
  print_impressoras_instaladas: boolean;
  print_programas_instalados: boolean;
  print_pastas_email_copia_psts: boolean;
  print_area_trabalho: boolean;
  copia_perfil_usuario: boolean;
};

export type ChecklistFormatacaoDepoisDasa = {
  impressoras_instaladas_testadas: boolean;
  programas_instalados_testados: boolean;
  pastas_email_psts_restauradas_email_ok: boolean;
  area_trabalho_restaurada: boolean;
  perfil_usuario_restaurado: boolean;
  testes_usuario_validados: boolean;
};

export type RatDasaAssinaturaReferencia = {
  caminho: string;
  registrada_em: string;
};

export type RatDasaSnapshotV1 = {
  modelo: "dasa-v1";
  schema_versao: 1;
  local: {
    unidade_nome: string;
    unidade_nome_origem: OrigemUnidadeDasa;
    marca: string;
    solicitante: string;
    setor: string;
    endereco: string;
    cidade: string;
    estado: string;
    telefone: string;
  };
  equipamento: {
    chamado_moebius: string;
    chamado_ca: string;
    patrimonio: string;
    service_tag_serial: string;
    marca: string;
    modelo: string;
    tipo: TipoEquipamentoDasa | "";
    tipo_outro: string;
  };
  atendimento: {
    tipo: TipoAtendimentoDasa | "";
    defeito_informado: string;
    defeito_constatado: string;
    observacoes_defeito: string;
    checklist_aplicado: ChecklistAplicadoDasa;
    checklist_formatacao: {
      antes: ChecklistFormatacaoAntesDasa;
      depois: ChecklistFormatacaoDepoisDasa;
    };
    solucao_aplicada: string;
    observacoes_solucao: string;
    problema_solucionado: boolean | null;
    garantia_acionada: boolean | null;
    retirado_laboratorio: boolean | null;
    retirada_estoque_ti: boolean | null;
    visita_improdutiva: boolean | null;
    encaminhado_para: string;
  };
  laudo: {
    laudado: boolean | null;
    motivo: MotivoLaudoDasa | "";
    centro_custo: string;
  };
  cliente: {
    nome_colaborador_acompanhante: string;
    assinatura_cliente: RatDasaAssinaturaReferencia | null;
    avaliacao: AvaliacaoDasa | "";
  };
  tecnico: {
    nome_tecnico: string;
    assinatura_tecnico: RatDasaAssinaturaReferencia | null;
    inicio_data: string;
    inicio_hora: string;
    termino_data: string;
    termino_hora: string;
  };
};
