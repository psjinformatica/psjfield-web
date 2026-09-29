import "server-only";

import { createHash } from "node:crypto";

import type { TransactionSql } from "postgres";

import {
  CAMPOS_COMPARTILHAVEIS_VISITAS,
  CAMPOS_EDICAO_CHAMADO,
  CAMPOS_FINANCEIROS_CHAMADO,
  ConflitoEdicaoChamadoError,
  camposAlterados,
  dadosEditaveisDoChamado,
  type AlteracaoChamado,
  type CampoEdicaoChamado,
  type ContextoEdicaoChamado,
  type DadosEdicaoChamado,
  type SolicitacaoEdicaoChamado,
} from "@/lib/chamados-edicao";
import { getSql } from "@/lib/db";
import { observeDatabaseOperation } from "@/lib/db-observability";
import { obterChamadoRaizId } from "@/lib/chamados-visitas";
import type { Chamado } from "@/lib/types";

type ChamadoEdicaoLinha = Chamado & { possui_recebivel?: boolean };
type AlteracaoLinha = Omit<AlteracaoChamado, "alterado_em"> & { alterado_em: string | Date };

const colunasChamado = `
  id, numero_chamado, visita_numero, chamado_raiz_id,
  empresa_parceira, cliente, projeto, assunto_email,
  remetente, destinatario, data_email, data_agendada, hora_agendada,
  usuario_responsavel, contato, telefone, unidade_nome, endereco, cidade, estado,
  atividade, descricao, equipamento, fabricante, modelo, patrimonio_ae,
  numero_serie, valor_base, horas_incluidas, valor_hora_adicional, visualizado_em,
  status, observacoes, hora_chegada, hora_inicio, hora_termino,
  descricao_servico, observacoes_atendimento
`;

function normalizarChamado(linha: ChamadoEdicaoLinha): Chamado {
  return {
    ...linha,
    id: Number(linha.id),
    visita_numero: Number(linha.visita_numero),
    chamado_raiz_id: linha.chamado_raiz_id === null ? null : Number(linha.chamado_raiz_id),
  };
}

function selecionar(dados: DadosEdicaoChamado, campos: readonly CampoEdicaoChamado[]) {
  return Object.fromEntries(campos.map((campo) => [campo, dados[campo]])) as Partial<DadosEdicaoChamado>;
}

function criarVersaoDados(dados: DadosEdicaoChamado) {
  return createHash("sha256").update(JSON.stringify(selecionar(dados, CAMPOS_EDICAO_CHAMADO))).digest("hex");
}

function criarVersaoGrupo(chamados: Chamado[]) {
  const snapshot = [...chamados]
    .sort((a, b) => a.id - b.id)
    .map((chamado) => ({ id: chamado.id, dados: selecionar(dadosEditaveisDoChamado(chamado), CAMPOS_COMPARTILHAVEIS_VISITAS) }));
  return createHash("sha256").update(JSON.stringify(snapshot)).digest("hex");
}

function normalizarAlteracao(linha: AlteracaoLinha): AlteracaoChamado {
  return {
    ...linha,
    chamado_id: Number(linha.chamado_id),
    alterado_em: linha.alterado_em instanceof Date
      ? linha.alterado_em.toISOString()
      : String(linha.alterado_em),
  };
}

export async function buscarContextoEdicaoChamado(id: number): Promise<ContextoEdicaoChamado | null> {
  return observeDatabaseOperation("chamados.buscarContextoEdicao", async () => {
    const sql = getSql();
    const linhas = await sql<ChamadoEdicaoLinha[]>`
      SELECT ${sql.unsafe(colunasChamado)},
             EXISTS (SELECT 1 FROM contas_receber cr WHERE cr.chamado_id = c.id) AS possui_recebivel
      FROM chamados c
      WHERE c.id = ${id}
    `;
    if (!linhas[0]) return null;
    const chamado = normalizarChamado(linhas[0]);
    const raizId = obterChamadoRaizId(chamado);
    const relacionadasLinhas = await sql<ChamadoEdicaoLinha[]>`
      SELECT ${sql.unsafe(colunasChamado)}
      FROM chamados
      WHERE id = ${raizId} OR chamado_raiz_id = ${raizId}
      ORDER BY visita_numero ASC
    `;
    const relacionadas = relacionadasLinhas.map(normalizarChamado);
    const alteracoes = await sql<AlteracaoLinha[]>`
      SELECT id, chamado_id, alterado_em, origem, escopo,
             campos_alterados, valores_anteriores, valores_novos
      FROM chamados_alteracoes
      WHERE chamado_id = ${id}
      ORDER BY alterado_em DESC
      LIMIT 20
    `;
    return {
      chamado,
      possui_recebivel: Boolean(linhas[0].possui_recebivel),
      quantidade_visitas: relacionadas.length,
      versao_dados: criarVersaoDados(dadosEditaveisDoChamado(chamado)),
      versao_grupo: criarVersaoGrupo(relacionadas),
      alteracoes: alteracoes.map(normalizarAlteracao),
    };
  });
}

async function registrarAuditoria(
  transacao: TransactionSql,
  chamadoId: number,
  escopo: SolicitacaoEdicaoChamado["escopo"],
  anterior: DadosEdicaoChamado,
  novo: DadosEdicaoChamado,
  campos: CampoEdicaoChamado[],
) {
  await transacao`
    INSERT INTO chamados_alteracoes (
      chamado_id, origem, escopo, campos_alterados, valores_anteriores, valores_novos
    ) VALUES (
      ${chamadoId}, 'EDICAO_MANUAL', ${escopo}, ${campos},
      ${transacao.json(selecionar(anterior, campos))},
      ${transacao.json(selecionar(novo, campos))}
    )
  `;
}

export async function editarDadosChamado(id: number, entrada: SolicitacaoEdicaoChamado) {
  return observeDatabaseOperation("chamados.editarDados", async () => {
    const sql = getSql();
    return sql.begin(async (transacao) => {
      const referencias = await transacao<{ id: number; chamado_raiz_id: number | null }[]>`
        SELECT id, chamado_raiz_id FROM chamados WHERE id = ${id} FOR UPDATE
      `;
      if (!referencias[0]) throw new Error("Chamado não encontrado.");
      const raizId = obterChamadoRaizId({
        id: Number(referencias[0].id),
        chamado_raiz_id: referencias[0].chamado_raiz_id === null ? null : Number(referencias[0].chamado_raiz_id),
      });
      const relacionadasLinhas = await transacao<ChamadoEdicaoLinha[]>`
        SELECT ${transacao.unsafe(colunasChamado)}
        FROM chamados
        WHERE id = ${raizId} OR chamado_raiz_id = ${raizId}
        ORDER BY id ASC
        FOR UPDATE
      `;
      const relacionadas = relacionadasLinhas.map(normalizarChamado);
      const atual = relacionadas.find((chamado) => chamado.id === id);
      if (!atual) throw new Error("Chamado não encontrado.");
      const dadosAtuais = dadosEditaveisDoChamado(atual);
      if (criarVersaoDados(dadosAtuais) !== entrada.versao_dados) {
        throw new ConflitoEdicaoChamadoError();
      }
      if (
        entrada.escopo === "TODAS_VISITAS_RELACIONADAS"
        && criarVersaoGrupo(relacionadas) !== entrada.versao_grupo
      ) {
        throw new ConflitoEdicaoChamadoError();
      }

      const mudancasAlvo = camposAlterados(dadosAtuais, entrada.dados);
      const mudouFinanceiro = mudancasAlvo.some((campo) => CAMPOS_FINANCEIROS_CHAMADO.includes(
        campo as typeof CAMPOS_FINANCEIROS_CHAMADO[number],
      ));
      if (mudouFinanceiro) {
        if (atual.status === "Concluído" || atual.status === "Improdutivo") {
          throw new Error("Os parâmetros financeiros não podem ser alterados porque o atendimento já foi encerrado.");
        }
        const recebiveis = await transacao<{ existe: boolean }[]>`
          SELECT EXISTS (SELECT 1 FROM contas_receber WHERE chamado_id = ${id}) AS existe
        `;
        if (recebiveis[0].existe) {
          throw new Error("Os parâmetros financeiros não podem ser alterados porque o Financeiro deste chamado já foi consolidado.");
        }
      }
      if (mudancasAlvo.length === 0) return { alterados: 0, campos_alterados: [] as CampoEdicaoChamado[] };

      const compartilhadasAlteradas = mudancasAlvo.filter((campo) => CAMPOS_COMPARTILHAVEIS_VISITAS.includes(
        campo as typeof CAMPOS_COMPARTILHAVEIS_VISITAS[number],
      ));
      let alterados = 0;
      for (const chamado of relacionadas) {
        const ehAlvo = chamado.id === id;
        const camposCandidatos = ehAlvo
          ? mudancasAlvo
          : entrada.escopo === "TODAS_VISITAS_RELACIONADAS" ? compartilhadasAlteradas : [];
        const anterior = dadosEditaveisDoChamado(chamado);
        const campos = camposCandidatos.filter(
          (campo) => (anterior[campo] ?? null) !== (entrada.dados[campo] ?? null),
        );
        if (campos.length === 0) continue;
        const novo = { ...anterior };
        for (const campo of campos) Object.assign(novo, { [campo]: entrada.dados[campo] });
        await transacao`
          UPDATE chamados
          SET ${transacao(selecionar(novo, campos), ...campos)}
          WHERE id = ${chamado.id}
        `;
        await registrarAuditoria(transacao, chamado.id, entrada.escopo, anterior, novo, campos);
        alterados += 1;
      }
      return { alterados, campos_alterados: mudancasAlvo };
    });
  });
}
