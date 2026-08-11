import "server-only";

import type postgres from "postgres";

import { getSql } from "@/lib/db";
import { calcularFinanceiro } from "@/lib/financeiro-calculo";
import { REGRA_PRECO_ATUAL, type ContaReceber } from "@/lib/financeiro-types";

type Transacao = postgres.TransactionSql<Record<string, never>>;

export async function registrarContaAutomatica(
  transacao: Transacao,
  chamado: { id: number; numero_chamado: string; hora_inicio: string; hora_termino: string },
  encerradoEm: string,
) {
  const calculo = calcularFinanceiro(chamado.hora_inicio, chamado.hora_termino);
  await transacao`
    INSERT INTO contas_receber (
      chamado_id, numero_chamado_snapshot, encerrado_em,
      hora_inicio_snapshot, hora_fim_snapshot, duracao_minutos, horas_adicionais,
      valor_base, valor_hora_adicional, valor_adicional, valor_total,
      regra_preco, origem, prazo_dias, situacao, revisao_pendente
    ) VALUES (
      ${chamado.id}, ${chamado.numero_chamado}, ${encerradoEm},
      ${chamado.hora_inicio}, ${chamado.hora_termino},
      ${calculo?.duracao_minutos ?? null}, ${calculo?.horas_adicionais ?? null},
      ${calculo?.valor_base ?? 100}, ${calculo?.valor_hora_adicional ?? 30},
      ${calculo?.valor_adicional ?? null}, ${calculo?.valor_total ?? null},
      ${REGRA_PRECO_ATUAL}, 'AUTOMATICO', 30,
      ${calculo ? "A_RECEBER" : "EM_REVISAO"}, ${!calculo}
    )
    ON CONFLICT (chamado_id) DO UPDATE SET
      numero_chamado_snapshot = CASE WHEN contas_receber.situacao = 'RECEBIDO' THEN contas_receber.numero_chamado_snapshot ELSE EXCLUDED.numero_chamado_snapshot END,
      encerrado_em = CASE WHEN contas_receber.situacao = 'RECEBIDO' THEN contas_receber.encerrado_em ELSE EXCLUDED.encerrado_em END,
      hora_inicio_snapshot = CASE WHEN contas_receber.situacao = 'RECEBIDO' THEN contas_receber.hora_inicio_snapshot ELSE EXCLUDED.hora_inicio_snapshot END,
      hora_fim_snapshot = CASE WHEN contas_receber.situacao = 'RECEBIDO' THEN contas_receber.hora_fim_snapshot ELSE EXCLUDED.hora_fim_snapshot END,
      duracao_minutos = CASE WHEN contas_receber.situacao = 'RECEBIDO' THEN contas_receber.duracao_minutos ELSE EXCLUDED.duracao_minutos END,
      horas_adicionais = CASE WHEN contas_receber.situacao = 'RECEBIDO' THEN contas_receber.horas_adicionais ELSE EXCLUDED.horas_adicionais END,
      valor_base = CASE WHEN contas_receber.situacao = 'RECEBIDO' THEN contas_receber.valor_base ELSE EXCLUDED.valor_base END,
      valor_hora_adicional = CASE WHEN contas_receber.situacao = 'RECEBIDO' THEN contas_receber.valor_hora_adicional ELSE EXCLUDED.valor_hora_adicional END,
      valor_adicional = CASE WHEN contas_receber.situacao = 'RECEBIDO' THEN contas_receber.valor_adicional ELSE EXCLUDED.valor_adicional END,
      valor_total = CASE WHEN contas_receber.situacao = 'RECEBIDO' THEN contas_receber.valor_total ELSE EXCLUDED.valor_total END,
      regra_preco = CASE WHEN contas_receber.situacao = 'RECEBIDO' THEN contas_receber.regra_preco ELSE EXCLUDED.regra_preco END,
      situacao = CASE WHEN contas_receber.situacao = 'RECEBIDO' THEN 'RECEBIDO' ELSE EXCLUDED.situacao END,
      revisao_pendente = CASE WHEN contas_receber.situacao = 'RECEBIDO' THEN TRUE ELSE EXCLUDED.revisao_pendente END,
      atualizado_em = NOW()
  `;
}

export async function colocarContaEmRevisao(transacao: Transacao, chamadoId: number) {
  await transacao`
    UPDATE contas_receber
    SET situacao = CASE WHEN situacao = 'RECEBIDO' THEN 'RECEBIDO' ELSE 'EM_REVISAO' END,
        revisao_pendente = TRUE,
        atualizado_em = NOW()
    WHERE chamado_id = ${chamadoId}
  `;
}

export async function listarContasReceber(): Promise<ContaReceber[]> {
  const sql = getSql();
  const linhas = await sql<ContaReceber[]>`
    SELECT cr.id, cr.chamado_id, cr.numero_chamado_snapshot AS numero_chamado,
           cr.encerrado_em, cr.hora_inicio_snapshot, cr.hora_fim_snapshot,
           cr.duracao_minutos, cr.horas_adicionais, cr.valor_base,
           cr.valor_hora_adicional, cr.valor_adicional, cr.valor_total,
           cr.regra_preco, cr.origem, cr.prazo_dias,
           TO_CHAR(
             (cr.encerrado_em AT TIME ZONE 'America/Sao_Paulo')::date + cr.prazo_dias,
             'YYYY-MM-DD'
           ) AS previsao_recebimento,
           cr.situacao, cr.revisao_pendente, cr.recebido_em, cr.valor_recebido,
           cr.observacoes,
           CASE
             WHEN cr.situacao = 'RECEBIDO' THEN 'Recebido'
             WHEN cr.situacao = 'EM_REVISAO' THEN 'Em revisão'
             WHEN ((cr.encerrado_em AT TIME ZONE 'America/Sao_Paulo')::date + cr.prazo_dias) <= (NOW() AT TIME ZONE 'America/Sao_Paulo')::date THEN 'Previsão atingida'
             WHEN ((cr.encerrado_em AT TIME ZONE 'America/Sao_Paulo')::date + cr.prazo_dias) <= (NOW() AT TIME ZONE 'America/Sao_Paulo')::date + 7 THEN 'Previsão próxima'
             ELSE 'A receber'
           END AS rotulo_situacao
    FROM contas_receber cr
    ORDER BY ((cr.encerrado_em AT TIME ZONE 'America/Sao_Paulo')::date + cr.prazo_dias) ASC NULLS LAST,
             cr.encerrado_em ASC NULLS LAST,
             cr.numero_chamado_snapshot ASC
  `;
  return linhas.map((linha) => ({ ...linha, chamado_id: Number(linha.chamado_id) }));
}

export async function marcarContaRecebida(id: string, valorRecebido: number, recebidoEm: string) {
  const sql = getSql();
  const linhas = await sql<ContaReceber[]>`
    UPDATE contas_receber
    SET situacao = 'RECEBIDO', recebido_em = ${recebidoEm}, valor_recebido = ${valorRecebido},
        revisao_pendente = FALSE, atualizado_em = NOW()
    WHERE id = ${id} AND situacao <> 'RECEBIDO' AND revisao_pendente = FALSE
    RETURNING id
  `;
  if (!linhas[0]) throw new Error("Conta não encontrada, já recebida ou pendente de revisão.");
}
