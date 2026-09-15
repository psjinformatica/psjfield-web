import { mapChamadoParaRatDasa } from "@/lib/rat-dasa-mapper";
import type { RatDasaSnapshotV1 } from "@/lib/rat-dasa-types";
import type { Chamado } from "@/lib/types";

export const chamadoSimulacaoRatDasa = {
  id: 20,
  numero_chamado: "SR-855635",
  status: "Em atendimento",
  data_agendada: "2026-09-15",
  hora_agendada: "09:00",
  cliente: "DASA",
  projeto: "",
  cidade: "Cidade Teste",
  estado: "PR",
  atividade: "Conectividade da unidade indisponível",
  valor_base: null,
  empresa_parceira: "Parceiro Teste",
  assunto_email: "",
  remetente: "",
  destinatario: "",
  data_email: "",
  usuario_responsavel: "",
  contato: "Solicitante Exemplo",
  telefone: "",
  endereco: "Endereço de teste, 100",
  descricao: "",
  equipamento: "UNIDADE-TESTE",
  fabricante: "",
  modelo: "",
  patrimonio_ae: "",
  numero_serie: "",
  horas_incluidas: null,
  valor_hora_adicional: null,
  observacoes: "",
  hora_chegada: "",
  hora_inicio: "09:00",
  hora_termino: "12:40",
  descricao_servico: "Conexões verificadas e diagnóstico registrado",
  observacoes_atendimento: "",
} satisfies Chamado;

export function criarSimulacaoRatDasa(): RatDasaSnapshotV1 {
  const inicial = mapChamadoParaRatDasa(chamadoSimulacaoRatDasa, {
    tecnico: {
      id: 1,
      nome_tecnico: "Técnico Exemplo",
      caminho_assinatura: "simulacao/assinatura-nao-utilizada.png",
      atualizado_em: "2026-09-15T12:40:00.000Z",
    },
    tipoAtendimentoSugerido: "FIELD_SERVICES",
  });
  return {
    ...inicial,
    atendimento: { ...inicial.atendimento, defeito_constatado: "Falha no circuito da operadora" },
    cliente: {
      ...inicial.cliente,
      nome_colaborador_acompanhante: "Colaborador Exemplo",
      assinatura_cliente: null,
    },
    tecnico: {
      ...inicial.tecnico,
      assinatura_tecnico: null,
      inicio_data: "2026-09-15",
      termino_data: "2026-09-15",
    },
  };
}
