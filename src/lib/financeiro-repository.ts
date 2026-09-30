import "server-only";

import type postgres from "postgres";

import { getSql } from "@/lib/db";
import { observeDatabaseOperation } from "@/lib/db-observability";
import {
  prepararRecebivelAutomatico,
} from "@/lib/financeiro-politicas";
import { REGRA_PRECO_ATUAL, type ContaReceber } from "@/lib/financeiro-types";
import { statusGeraRecebimento } from "@/lib/status";

type Transacao = postgres.TransactionSql<Record<string, never>>;

export type ResultadoReparoRecebivel = {
  criado: boolean;
  recebivel_id: string;
  chamado_id: number;
  previsao_recebimento: string;
  duracao_minutos: number;
  valor_total: number;
  regra_preco: typeof REGRA_PRECO_ATUAL;
};

export async function registrarContaAutomatica(
  transacao: Transacao,
  chamado: { id: number; numero_chamado: string; cliente: string; hora_inicio: string; hora_termino: string },
  encerradoEm: string,
) {
  const recebivel = prepararRecebivelAutomatico(
    chamado.cliente,
    encerradoEm,
    chamado.hora_inicio,
    chamado.hora_termino,
  );
  if (!recebivel) return false;
  const { calculo, prazo_dias: prazoDias } = recebivel;
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
      ${REGRA_PRECO_ATUAL}, 'AUTOMATICO', ${prazoDias},
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
      prazo_dias = CASE WHEN contas_receber.situacao = 'RECEBIDO' THEN contas_receber.prazo_dias ELSE EXCLUDED.prazo_dias END,
      situacao = CASE WHEN contas_receber.situacao = 'RECEBIDO' THEN 'RECEBIDO' ELSE EXCLUDED.situacao END,
      revisao_pendente = CASE WHEN contas_receber.situacao = 'RECEBIDO' THEN TRUE ELSE EXCLUDED.revisao_pendente END,
      atualizado_em = NOW()
  `;
  return true;
}

export async function repararContaAutomaticaAusente(
  chamadoId: number,
): Promise<ResultadoReparoRecebivel> {
  return observeDatabaseOperation("financeiro.repararAusente", async () => {
    const sql = getSql();
    return sql.begin(async (transacao) => {
      const chamados = await transacao<{
        id: number;
        numero_chamado: string;
        cliente: string;
        status: string;
        hora_inicio: string;
        hora_termino: string;
        atualizado_em: Date | string;
      }[]>`
        SELECT id, numero_chamado, cliente, status, hora_inicio, hora_termino, atualizado_em
        FROM chamados
        WHERE id = ${chamadoId}
        FOR UPDATE
      `;
      const chamado = chamados[0];
      if (!chamado) throw new Error("Chamado não encontrado.");
      if (!statusGeraRecebimento(chamado.status)) {
        throw new Error(`O chamado ${chamadoId} não possui status financeiro encerrado.`);
      }

      const existentes = await transacao<{ id: string }[]>`
        SELECT id FROM contas_receber WHERE chamado_id = ${chamadoId}
      `;
      const encerradoEm = chamado.atualizado_em instanceof Date
        ? chamado.atualizado_em.toISOString()
        : chamado.atualizado_em;
      const preparado = prepararRecebivelAutomatico(
        chamado.cliente,
        encerradoEm,
        chamado.hora_inicio,
        chamado.hora_termino,
      );
      if (!preparado?.calculo) {
        throw new Error(`Não foi possível reconstruir integralmente o recebível do chamado ${chamadoId}.`);
      }
      const resultadoBase = {
        chamado_id: Number(chamado.id),
        previsao_recebimento: preparado.previsao_recebimento,
        duracao_minutos: preparado.calculo.duracao_minutos,
        valor_total: preparado.calculo.valor_total,
        regra_preco: preparado.calculo.regra_preco,
      };
      if (existentes[0]) {
        return { criado: false, recebivel_id: existentes[0].id, ...resultadoBase };
      }

      const calculo = preparado.calculo;
      const inseridas = await transacao<{ id: string }[]>`
        INSERT INTO contas_receber (
          chamado_id, numero_chamado_snapshot, encerrado_em,
          hora_inicio_snapshot, hora_fim_snapshot, duracao_minutos, horas_adicionais,
          valor_base, valor_hora_adicional, valor_adicional, valor_total,
          regra_preco, origem, prazo_dias, situacao, revisao_pendente
        ) VALUES (
          ${chamado.id}, ${chamado.numero_chamado}, ${encerradoEm},
          ${chamado.hora_inicio}, ${chamado.hora_termino},
          ${calculo.duracao_minutos}, ${calculo.horas_adicionais},
          ${calculo.valor_base}, ${calculo.valor_hora_adicional},
          ${calculo.valor_adicional}, ${calculo.valor_total},
          ${calculo.regra_preco}, 'AUTOMATICO', ${preparado.prazo_dias},
          'A_RECEBER', FALSE
        )
        ON CONFLICT (chamado_id) DO NOTHING
        RETURNING id
      `;
      const recebivelId = inseridas[0]?.id;
      if (!recebivelId) {
        const concorrentes = await transacao<{ id: string }[]>`
          SELECT id FROM contas_receber WHERE chamado_id = ${chamadoId}
        `;
        if (!concorrentes[0]) {
          throw new Error(`O reparo do chamado ${chamadoId} não criou nem encontrou um recebível.`);
        }
        return { criado: false, recebivel_id: concorrentes[0].id, ...resultadoBase };
      }
      return { criado: true, recebivel_id: recebivelId, ...resultadoBase };
    });
  });
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
  return observeDatabaseOperation("financeiro.listar", async () => {
    const sql = getSql();
    const linhas = await sql<ContaReceber[]>`
    SELECT cr.id, cr.chamado_id, cr.numero_chamado_snapshot AS numero_chamado,
           c.visita_numero,
           (SELECT COUNT(*)::int FROM chamados visita
            WHERE visita.id = raiz.id OR visita.chamado_raiz_id = raiz.id) AS quantidade_visitas,
           cr.encerrado_em, cr.hora_inicio_snapshot, cr.hora_fim_snapshot,
           cr.duracao_minutos, cr.horas_adicionais, cr.valor_base,
           cr.valor_hora_adicional, cr.valor_adicional, cr.valor_total,
           cr.regra_preco, cr.origem, cr.prazo_dias,
           TO_CHAR(
             (cr.encerrado_em AT TIME ZONE 'America/Sao_Paulo')::date + cr.prazo_dias,
             'YYYY-MM-DD'
           ) AS previsao_recebimento,
           cr.situacao, cr.revisao_pendente,
           TO_CHAR(cr.recebido_em, 'YYYY-MM-DD') AS recebido_em,
           cr.valor_recebido,
           cr.observacoes,
           CASE
             WHEN cr.situacao = 'RECEBIDO' THEN 'Recebido'
             WHEN cr.situacao = 'EM_REVISAO' THEN 'Em revisão'
             WHEN ((cr.encerrado_em AT TIME ZONE 'America/Sao_Paulo')::date + cr.prazo_dias) <= (NOW() AT TIME ZONE 'America/Sao_Paulo')::date THEN 'Previsão atingida'
             WHEN ((cr.encerrado_em AT TIME ZONE 'America/Sao_Paulo')::date + cr.prazo_dias) <= (NOW() AT TIME ZONE 'America/Sao_Paulo')::date + 7 THEN 'Previsão próxima'
             ELSE 'A receber'
           END AS rotulo_situacao
    FROM contas_receber cr
    JOIN chamados c ON c.id = cr.chamado_id
    CROSS JOIN LATERAL (SELECT COALESCE(c.chamado_raiz_id, c.id) AS id) raiz
    ORDER BY ((cr.encerrado_em AT TIME ZONE 'America/Sao_Paulo')::date + cr.prazo_dias) ASC NULLS LAST,
             cr.encerrado_em ASC NULLS LAST,
             cr.numero_chamado_snapshot ASC
  `;
    return linhas.map((linha) => ({
      ...linha,
      chamado_id: Number(linha.chamado_id),
      visita_numero: Number(linha.visita_numero),
      quantidade_visitas: Number(linha.quantidade_visitas),
    }));
  });
}

export async function marcarContaRecebida(id: string, valorRecebido: number, recebidoEm: string) {
  return observeDatabaseOperation("financeiro.marcarRecebida", async () => {
    const sql = getSql();
    const linhas = await sql<ContaReceber[]>`
    UPDATE contas_receber
    SET situacao = 'RECEBIDO', recebido_em = ${recebidoEm}, valor_recebido = ${valorRecebido},
        revisao_pendente = FALSE, atualizado_em = NOW()
    WHERE id = ${id} AND situacao <> 'RECEBIDO' AND revisao_pendente = FALSE
    RETURNING id
  `;
    if (!linhas[0]) throw new Error("Conta não encontrada, já recebida ou pendente de revisão.");
  });
}

export async function reverterContaRecebida(id: string) {
  return observeDatabaseOperation("financeiro.reverterRecebimento", async () => {
    const sql = getSql();
    const linhas = await sql<Pick<ContaReceber, "id">[]>`
      UPDATE contas_receber
      SET situacao = CASE WHEN revisao_pendente THEN 'EM_REVISAO' ELSE 'A_RECEBER' END,
          recebido_em = NULL,
          valor_recebido = NULL,
          atualizado_em = NOW()
      WHERE id = ${id} AND situacao = 'RECEBIDO'
      RETURNING id
    `;
    if (!linhas[0]) throw new Error("Conta não encontrada ou não está recebida.");
  });
}
