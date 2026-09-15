import type { AssinaturaTecnico } from "@/lib/assinaturas-types";
import { mapChamadoParaRatDasa } from "@/lib/rat-dasa-mapper";
import type { RatDasaSnapshotV1 } from "@/lib/rat-dasa-types";
import type { Chamado } from "@/lib/types";

export const chamadoDasaSeguro = {
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

export const tecnicoDasaSeguro = {
  id: 1,
  nome_tecnico: "Técnico Exemplo",
  caminho_assinatura: "tecnico/assinatura-teste.png",
  atualizado_em: "2026-09-15T15:40:00.000Z",
} satisfies AssinaturaTecnico;

export function criarRatDasaValida(): RatDasaSnapshotV1 {
  const dados = mapChamadoParaRatDasa(chamadoDasaSeguro, {
    tecnico: tecnicoDasaSeguro,
    tipoAtendimentoSugerido: "FIELD_SERVICES",
  });
  return {
    ...dados,
    atendimento: {
      ...dados.atendimento,
      defeito_constatado: "Falha no circuito da operadora",
    },
    cliente: {
      ...dados.cliente,
      nome_colaborador_acompanhante: "Colaborador Exemplo",
      assinatura_cliente: {
        caminho: "clientes/20/assinatura-teste.png",
        registrada_em: "2026-09-15T15:40:00.000Z",
      },
    },
    tecnico: {
      ...dados.tecnico,
      inicio_data: "2026-09-15",
      termino_data: "2026-09-15",
    },
  };
}
