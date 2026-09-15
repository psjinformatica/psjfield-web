import { z } from "zod";

import {
  AVALIACOES_DASA,
  MOTIVOS_LAUDO_DASA,
  ORIGENS_UNIDADE_DASA,
  TIPOS_ATENDIMENTO_DASA,
  TIPOS_EQUIPAMENTO_DASA,
} from "@/lib/rat-dasa-types";

const texto = z.string().trim().max(5_000);
function dataIsoValida(valor: string) {
  if (valor === "") return true;
  const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(valor);
  if (!partes) return false;
  const data = new Date(Date.UTC(Number(partes[1]), Number(partes[2]) - 1, Number(partes[3])));
  return data.getUTCFullYear() === Number(partes[1])
    && data.getUTCMonth() === Number(partes[2]) - 1
    && data.getUTCDate() === Number(partes[3]);
}
const data = texto.refine(dataIsoValida, "Informe uma data válida no formato AAAA-MM-DD.");
const hora = texto.refine((valor) => valor === "" || /^([01]\d|2[0-3]):[0-5]\d$/.test(valor), "Informe a hora no formato HH:MM.");
const opcaoVazia = <T extends readonly [string, ...string[]]>(opcoes: T) => z.enum(opcoes).or(z.literal(""));

const checklistAplicadoSchema = z.object({
  energia: z.boolean(), cabo_video: z.boolean(), demais_perifericos: z.boolean(), rede_rj45: z.boolean(),
  system_center: z.boolean(), antivirus: z.boolean(), limpeza_temporarios: z.boolean(),
  ativacao_windows_office: z.boolean(), hostname_correto: z.boolean(), problema_reincidente: z.boolean(),
});

const checklistFormatacaoAntesSchema = z.object({
  print_impressoras_instaladas: z.boolean(), print_programas_instalados: z.boolean(),
  print_pastas_email_copia_psts: z.boolean(), print_area_trabalho: z.boolean(), copia_perfil_usuario: z.boolean(),
});

const checklistFormatacaoDepoisSchema = z.object({
  impressoras_instaladas_testadas: z.boolean(), programas_instalados_testados: z.boolean(),
  pastas_email_psts_restauradas_email_ok: z.boolean(), area_trabalho_restaurada: z.boolean(),
  perfil_usuario_restaurado: z.boolean(), testes_usuario_validados: z.boolean(),
});

const assinaturaReferenciaSchema = z.object({
  caminho: texto.min(1, "Informe a referência da assinatura."),
  registrada_em: texto.min(1, "Informe quando a assinatura foi registrada."),
});

export const ratDasaSnapshotV1Schema = z.object({
  modelo: z.literal("dasa-v1"),
  schema_versao: z.literal(1),
  local: z.object({
    unidade_nome: texto,
    unidade_nome_origem: z.enum(ORIGENS_UNIDADE_DASA),
    marca: texto,
    solicitante: texto,
    setor: texto,
    endereco: texto,
    cidade: texto,
    estado: texto,
    telefone: texto,
  }),
  equipamento: z.object({
    chamado_moebius: texto,
    chamado_ca: texto,
    patrimonio: texto,
    service_tag_serial: texto,
    marca: texto,
    modelo: texto,
    tipo: opcaoVazia(TIPOS_EQUIPAMENTO_DASA),
    tipo_outro: texto,
  }),
  atendimento: z.object({
    tipo: opcaoVazia(TIPOS_ATENDIMENTO_DASA),
    defeito_informado: texto,
    defeito_constatado: texto,
    observacoes_defeito: texto,
    checklist_aplicado: checklistAplicadoSchema,
    checklist_formatacao: z.object({ antes: checklistFormatacaoAntesSchema, depois: checklistFormatacaoDepoisSchema }),
    solucao_aplicada: texto,
    observacoes_solucao: texto,
    problema_solucionado: z.boolean().nullable(),
    garantia_acionada: z.boolean().nullable(),
    retirado_laboratorio: z.boolean().nullable(),
    retirada_estoque_ti: z.boolean().nullable(),
    visita_improdutiva: z.boolean().nullable(),
    encaminhado_para: texto,
  }),
  laudo: z.object({
    laudado: z.boolean().nullable(),
    motivo: opcaoVazia(MOTIVOS_LAUDO_DASA),
    centro_custo: texto,
  }),
  cliente: z.object({
    nome_colaborador_acompanhante: texto,
    assinatura_cliente: assinaturaReferenciaSchema.nullable(),
    avaliacao: opcaoVazia(AVALIACOES_DASA),
  }),
  tecnico: z.object({
    nome_tecnico: texto,
    assinatura_tecnico: assinaturaReferenciaSchema.nullable(),
    inicio_data: data,
    inicio_hora: hora,
    termino_data: data,
    termino_hora: hora,
  }),
});

function obrigatorio(valor: string, contexto: z.RefinementCtx, caminho: PropertyKey[], mensagem: string) {
  if (!valor) contexto.addIssue({ code: "custom", path: caminho, message: mensagem });
}

export const ratDasaFormularioV1Schema = ratDasaSnapshotV1Schema.superRefine((dados, contexto) => {
  obrigatorio(dados.equipamento.chamado_moebius, contexto, ["equipamento", "chamado_moebius"], "Informe o chamado Moebius.");
  if (dados.local.unidade_nome_origem !== "NAO_IDENTIFICADA") {
    obrigatorio(dados.local.unidade_nome, contexto, ["local", "unidade_nome"], "Informe a unidade/nome.");
  }
  obrigatorio(dados.local.endereco, contexto, ["local", "endereco"], "Informe o endereço.");
  obrigatorio(dados.local.cidade, contexto, ["local", "cidade"], "Informe a cidade.");
  obrigatorio(dados.local.estado, contexto, ["local", "estado"], "Informe o estado.");
  obrigatorio(dados.atendimento.tipo, contexto, ["atendimento", "tipo"], "Informe o tipo de atendimento.");
  obrigatorio(dados.atendimento.defeito_informado, contexto, ["atendimento", "defeito_informado"], "Informe o defeito informado.");
  obrigatorio(dados.atendimento.defeito_constatado, contexto, ["atendimento", "defeito_constatado"], "Informe o defeito constatado.");
  obrigatorio(dados.atendimento.solucao_aplicada, contexto, ["atendimento", "solucao_aplicada"], "Informe a solução aplicada.");
  obrigatorio(dados.cliente.nome_colaborador_acompanhante, contexto, ["cliente", "nome_colaborador_acompanhante"], "Informe o nome do colaborador acompanhante.");
  obrigatorio(dados.tecnico.nome_tecnico, contexto, ["tecnico", "nome_tecnico"], "Informe o nome do técnico.");
  obrigatorio(dados.tecnico.inicio_data, contexto, ["tecnico", "inicio_data"], "Informe a data de início.");
  obrigatorio(dados.tecnico.inicio_hora, contexto, ["tecnico", "inicio_hora"], "Informe a hora de início.");
  obrigatorio(dados.tecnico.termino_data, contexto, ["tecnico", "termino_data"], "Informe a data de término.");
  obrigatorio(dados.tecnico.termino_hora, contexto, ["tecnico", "termino_hora"], "Informe a hora de término.");
  if (dados.equipamento.tipo === "Outro") {
    obrigatorio(dados.equipamento.tipo_outro, contexto, ["equipamento", "tipo_outro"], "Descreva o outro tipo de equipamento.");
  }
  if (dados.laudo.laudado === true) {
    obrigatorio(dados.laudo.motivo, contexto, ["laudo", "motivo"], "Informe o motivo do laudo.");
  }
});

export const assinaturasRatDasaV1Schema = z.object({
  assinatura_cliente: assinaturaReferenciaSchema.nullable(),
  assinatura_tecnico: assinaturaReferenciaSchema.nullable(),
});

export function validarEstruturaRatDasaV1(entrada: unknown) {
  return ratDasaSnapshotV1Schema.parse(entrada);
}

export function validarFormularioRatDasaV1(entrada: unknown) {
  return ratDasaFormularioV1Schema.parse(entrada);
}

export function validarAssinaturasRatDasaV1(entrada: unknown) {
  return assinaturasRatDasaV1Schema.parse(entrada);
}

export function validarRatDasaV1ParaGeracao(entrada: unknown) {
  const dados = validarFormularioRatDasaV1(entrada);
  validarAssinaturasRatDasaV1({
    assinatura_cliente: dados.cliente.assinatura_cliente,
    assinatura_tecnico: dados.tecnico.assinatura_tecnico,
  });
  return dados;
}

const ROTULOS_CAMPOS_DASA: Record<string, string> = {
  "equipamento.chamado_moebius": "Chamado Moebius",
  "local.unidade_nome": "Unidade/nome",
  "local.endereco": "Endereço",
  "local.cidade": "Cidade",
  "local.estado": "Estado",
  "atendimento.tipo": "Tipo de atendimento",
  "atendimento.defeito_informado": "Defeito informado",
  "atendimento.defeito_constatado": "Defeito constatado",
  "atendimento.solucao_aplicada": "Solução aplicada",
  "cliente.nome_colaborador_acompanhante": "Colaborador que acompanhou o atendimento",
  "tecnico.nome_tecnico": "Nome do técnico",
  "tecnico.inicio_data": "Data de início",
  "tecnico.inicio_hora": "Hora de início",
  "tecnico.termino_data": "Data de término",
  "tecnico.termino_hora": "Hora de término",
  "equipamento.tipo_outro": "Outro tipo de equipamento",
  "laudo.motivo": "Motivo do laudo",
};

export type PendenciaRatDasa = { campo: string; mensagem: string };

export function listarPendenciasRatDasaV1(entrada: unknown): PendenciaRatDasa[] {
  const resultado = ratDasaFormularioV1Schema.safeParse(entrada);
  if (resultado.success) return [];
  const pendencias = new Map<string, PendenciaRatDasa>();
  resultado.error.issues.forEach((questao) => {
    const caminho = questao.path.join(".");
    if (!pendencias.has(caminho)) {
      pendencias.set(caminho, {
        campo: ROTULOS_CAMPOS_DASA[caminho] || caminho || "Formulário",
        mensagem: questao.message,
      });
    }
  });
  return [...pendencias.values()];
}
