import { z } from "zod";

import type { Chamado } from "@/lib/types";

export const CAMPOS_EDICAO_CHAMADO = [
  "numero_chamado", "cliente", "projeto", "usuario_responsavel", "contato", "telefone",
  "unidade_nome", "endereco", "cidade", "estado", "atividade", "descricao", "observacoes",
  "equipamento", "fabricante", "modelo", "numero_serie", "patrimonio_ae",
  "valor_base", "horas_incluidas", "valor_hora_adicional",
] as const;

export type CampoEdicaoChamado = typeof CAMPOS_EDICAO_CHAMADO[number];
export type DadosEdicaoChamado = Pick<Chamado, CampoEdicaoChamado>;
export type EscopoEdicaoChamado = "SOMENTE_ESTA_VISITA" | "TODAS_VISITAS_RELACIONADAS";

export const CAMPOS_COMPARTILHAVEIS_VISITAS = [
  "numero_chamado", "cliente", "projeto", "usuario_responsavel", "contato", "telefone",
  "unidade_nome", "endereco", "cidade", "estado", "atividade", "equipamento", "fabricante",
  "modelo", "numero_serie", "patrimonio_ae",
] as const satisfies readonly CampoEdicaoChamado[];

export const CAMPOS_FINANCEIROS_CHAMADO = [
  "valor_base", "horas_incluidas", "valor_hora_adicional",
] as const satisfies readonly CampoEdicaoChamado[];

export const ROTULOS_CAMPOS_EDICAO_CHAMADO: Record<CampoEdicaoChamado, string> = {
  numero_chamado: "Número do chamado",
  cliente: "Cliente",
  projeto: "Projeto",
  usuario_responsavel: "Usuário responsável/Login",
  contato: "Solicitante/Contato",
  telefone: "Telefone",
  unidade_nome: "Unidade/Nome",
  endereco: "Endereço",
  cidade: "Cidade",
  estado: "UF",
  atividade: "Atividade/Defeito/Solicitação original",
  descricao: "Descrição",
  observacoes: "Observações",
  equipamento: "Equipamento",
  fabricante: "Fabricante",
  modelo: "Modelo",
  numero_serie: "Número de série",
  patrimonio_ae: "Patrimônio/AE",
  valor_base: "Valor-base",
  horas_incluidas: "Horas incluídas",
  valor_hora_adicional: "Valor da hora adicional",
};

const texto = (maximo = 2_000) => z.string().trim().max(maximo);
const numeroFinanceiro = z.union([z.null(), z.string().trim()]).transform((valor, contexto) => {
  if (valor === null || valor === "") return null;
  const normalizado = valor.replace(",", ".");
  if (!/^\d+(?:\.\d+)?$/.test(normalizado) || !Number.isFinite(Number(normalizado))) {
    contexto.addIssue({ code: "custom", message: "Informe um número não negativo válido." });
    return z.NEVER;
  }
  return normalizado;
});

export const dadosEdicaoChamadoSchema = z.object({
  numero_chamado: texto(100).refine(
    (valor) => valor === "" || /^(?:MI|SR)-\d+(?:-\d+)?$/i.test(valor),
    "Número do chamado inválido. Use MI-123, MI-123-2 ou SR-123.",
  ),
  cliente: texto(500),
  projeto: texto(500),
  usuario_responsavel: texto(500),
  contato: texto(500),
  telefone: texto(100),
  unidade_nome: z.union([z.null(), texto(1_000)]).transform((valor) => valor || null),
  endereco: texto(2_000),
  cidade: texto(500),
  estado: texto(2).refine((valor) => valor === "" || /^[A-Za-z]{2}$/.test(valor), "UF inválida."),
  atividade: texto(10_000),
  descricao: texto(10_000),
  observacoes: texto(10_000),
  equipamento: texto(2_000),
  fabricante: texto(500),
  modelo: texto(1_000),
  numero_serie: texto(500),
  patrimonio_ae: texto(500),
  valor_base: numeroFinanceiro,
  horas_incluidas: numeroFinanceiro,
  valor_hora_adicional: numeroFinanceiro,
}).strict();

export const solicitacaoEdicaoChamadoSchema = z.object({
  dados: dadosEdicaoChamadoSchema,
  escopo: z.enum(["SOMENTE_ESTA_VISITA", "TODAS_VISITAS_RELACIONADAS"]),
  versao_dados: z.string().regex(/^[a-f0-9]{64}$/),
  versao_grupo: z.string().regex(/^[a-f0-9]{64}$/),
}).strict();

export type SolicitacaoEdicaoChamado = z.infer<typeof solicitacaoEdicaoChamadoSchema>;

export type AlteracaoChamado = {
  id: string;
  chamado_id: number;
  alterado_em: string;
  origem: "EDICAO_MANUAL";
  escopo: EscopoEdicaoChamado;
  campos_alterados: CampoEdicaoChamado[];
  valores_anteriores: Partial<DadosEdicaoChamado>;
  valores_novos: Partial<DadosEdicaoChamado>;
};

export type ContextoEdicaoChamado = {
  chamado: Chamado;
  possui_recebivel: boolean;
  quantidade_visitas: number;
  versao_dados: string;
  versao_grupo: string;
  alteracoes: AlteracaoChamado[];
};

export function dadosEditaveisDoChamado(chamado: Chamado): DadosEdicaoChamado {
  return Object.fromEntries(CAMPOS_EDICAO_CHAMADO.map((campo) => [campo, chamado[campo]])) as DadosEdicaoChamado;
}

export function camposAlterados(
  anterior: DadosEdicaoChamado,
  novo: DadosEdicaoChamado,
): CampoEdicaoChamado[] {
  return CAMPOS_EDICAO_CHAMADO.filter((campo) => (anterior[campo] ?? null) !== (novo[campo] ?? null));
}

export function validarSolicitacaoEdicaoChamado(input: unknown) {
  return solicitacaoEdicaoChamadoSchema.parse(input);
}

export class ConflitoEdicaoChamadoError extends Error {
  constructor() {
    super("Os dados do chamado foram alterados em outra tela. Recarregue e revise antes de salvar novamente.");
    this.name = "ConflitoEdicaoChamadoError";
  }
}
