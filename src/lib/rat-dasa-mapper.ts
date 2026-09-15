import type { AssinaturaTecnico } from "@/lib/assinaturas-types";
import type {
  ChecklistAplicadoDasa,
  ChecklistFormatacaoAntesDasa,
  ChecklistFormatacaoDepoisDasa,
  RatDasaSnapshotV1,
  TipoAtendimentoDasa,
} from "@/lib/rat-dasa-types";
import type { Chamado } from "@/lib/types";

const checklistAplicadoVazio = (): ChecklistAplicadoDasa => ({
  energia: false,
  cabo_video: false,
  demais_perifericos: false,
  rede_rj45: false,
  system_center: false,
  antivirus: false,
  limpeza_temporarios: false,
  ativacao_windows_office: false,
  hostname_correto: false,
  problema_reincidente: false,
});

const checklistFormatacaoAntesVazio = (): ChecklistFormatacaoAntesDasa => ({
  print_impressoras_instaladas: false,
  print_programas_instalados: false,
  print_pastas_email_copia_psts: false,
  print_area_trabalho: false,
  copia_perfil_usuario: false,
});

const checklistFormatacaoDepoisVazio = (): ChecklistFormatacaoDepoisDasa => ({
  impressoras_instaladas_testadas: false,
  programas_instalados_testados: false,
  pastas_email_psts_restauradas_email_ok: false,
  area_trabalho_restaurada: false,
  perfil_usuario_restaurado: false,
  testes_usuario_validados: false,
});

export type OpcoesMapeamentoRatDasa = {
  tecnico?: AssinaturaTecnico | null;
  tipoAtendimentoSugerido?: TipoAtendimentoDasa;
};

export function mapChamadoParaRatDasa(
  chamado: Chamado,
  opcoes: OpcoesMapeamentoRatDasa = {},
): RatDasaSnapshotV1 {
  const unidadeSugerida = chamado.equipamento?.trim() || "";
  const tecnico = opcoes.tecnico;

  return {
    modelo: "dasa-v1",
    schema_versao: 1,
    local: {
      unidade_nome: unidadeSugerida,
      unidade_nome_origem: unidadeSugerida ? "EQUIPAMENTO_SUGERIDO" : "NAO_IDENTIFICADA",
      marca: "",
      solicitante: chamado.contato || "",
      setor: "",
      endereco: chamado.endereco || "",
      cidade: chamado.cidade || "",
      estado: chamado.estado || "",
      telefone: chamado.telefone || "",
    },
    equipamento: {
      chamado_moebius: chamado.numero_chamado || "",
      chamado_ca: "",
      patrimonio: chamado.patrimonio_ae || "",
      service_tag_serial: chamado.numero_serie || "",
      marca: chamado.fabricante || "",
      modelo: chamado.modelo || "",
      tipo: "",
      tipo_outro: "",
    },
    atendimento: {
      tipo: opcoes.tipoAtendimentoSugerido || "",
      defeito_informado: chamado.atividade || chamado.descricao || "",
      defeito_constatado: "",
      observacoes_defeito: "",
      checklist_aplicado: checklistAplicadoVazio(),
      checklist_formatacao: {
        antes: checklistFormatacaoAntesVazio(),
        depois: checklistFormatacaoDepoisVazio(),
      },
      solucao_aplicada: chamado.descricao_servico || "",
      observacoes_solucao: chamado.observacoes_atendimento || "",
      problema_solucionado: null,
      garantia_acionada: null,
      retirado_laboratorio: null,
      retirada_estoque_ti: null,
      visita_improdutiva: chamado.status === "Improdutivo" ? true : null,
      encaminhado_para: "",
    },
    laudo: {
      laudado: null,
      motivo: "",
      centro_custo: "",
    },
    cliente: {
      nome_colaborador_acompanhante: "",
      assinatura_cliente: null,
      avaliacao: "",
    },
    tecnico: {
      nome_tecnico: tecnico?.nome_tecnico || "",
      assinatura_tecnico: tecnico ? {
        caminho: tecnico.caminho_assinatura,
        registrada_em: tecnico.atualizado_em,
      } : null,
      inicio_data: "",
      inicio_hora: chamado.hora_inicio || "",
      termino_data: "",
      termino_hora: chamado.hora_termino || "",
    },
  };
}
