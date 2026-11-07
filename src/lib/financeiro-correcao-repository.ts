import "server-only";

import { createHash } from "node:crypto";

import {
  ROTULOS_CAMPOS_AUDITORIA_CHAMADO,
  type CampoAuditoriaChamado,
} from "@/lib/chamados-edicao";
import { getSql } from "@/lib/db";
import { observeDatabaseOperation } from "@/lib/db-observability";
import {
  ConflitoCorrecaoFinanceiraError,
  type ParametrosCorrecaoFinanceira,
  type PreviaCorrecaoFinanceira,
  type ValoresCorrecaoFinanceira,
} from "@/lib/financeiro-correcao";
import { resolverParametrosFinanceiros } from "@/lib/financeiro-parametros";
import { prepararRecebivelAutomatico } from "@/lib/financeiro-politicas";
import { statusGeraRecebimento } from "@/lib/status";

type LinhaCorrecao = {
  conta_id: string;
  chamado_id: number;
  numero_chamado: string;
  cliente: string;
  status_chamado: string;
  valor_base_chamado: string | null;
  horas_incluidas_chamado: string | null;
  valor_hora_adicional_chamado: string | null;
  atualizado_em_chamado: Date | string;
  encerrado_em: Date | string;
  hora_inicio_snapshot: string;
  hora_fim_snapshot: string;
  duracao_minutos: number | null;
  horas_adicionais: number | null;
  valor_base: string;
  valor_hora_adicional: string;
  valor_adicional: string | null;
  valor_total: string | null;
  regra_preco: string;
  origem: string;
  prazo_dias: number;
  previsao_recebimento: string;
  situacao: string;
  revisao_pendente: boolean;
  recebido_em: string | null;
  valor_recebido: string | null;
  atualizado_em_conta: Date | string;
};

function iso(valor: Date | string) {
  return valor instanceof Date ? valor.toISOString() : String(valor);
}
function numero(valor: string | number | null) {
  return valor === null ? 0 : Number(valor);
}

function criarVersao(linha: LinhaCorrecao) {
  return createHash("sha256").update(JSON.stringify({
    conta_id: linha.conta_id,
    chamado_id: Number(linha.chamado_id),
    status_chamado: linha.status_chamado,
    valor_base_chamado: linha.valor_base_chamado,
    horas_incluidas_chamado: linha.horas_incluidas_chamado,
    valor_hora_adicional_chamado: linha.valor_hora_adicional_chamado,
    atualizado_em_chamado: iso(linha.atualizado_em_chamado),
    situacao: linha.situacao,
    revisao_pendente: linha.revisao_pendente,
    recebido_em: linha.recebido_em,
    valor_recebido: linha.valor_recebido,
    duracao_minutos: linha.duracao_minutos,
    valor_base: linha.valor_base,
    valor_hora_adicional: linha.valor_hora_adicional,
    valor_adicional: linha.valor_adicional,
    valor_total: linha.valor_total,
    regra_preco: linha.regra_preco,
    atualizado_em_conta: iso(linha.atualizado_em_conta),
  })).digest("hex");
}

function validarElegibilidade(linha: LinhaCorrecao) {
  if (
    linha.situacao !== "A_RECEBER"
    || linha.revisao_pendente
    || linha.recebido_em !== null
    || linha.valor_recebido !== null
  ) {
    throw new ConflitoCorrecaoFinanceiraError(
      "A correção é permitida somente para recebíveis A_RECEBER e sem revisão pendente.",
    );
  }
  if (!statusGeraRecebimento(linha.status_chamado)) {
    throw new ConflitoCorrecaoFinanceiraError("O chamado não possui status financeiro encerrado elegível.");
  }
  if (linha.duracao_minutos === null || linha.valor_total === null || linha.valor_adicional === null) {
    throw new ConflitoCorrecaoFinanceiraError("O recebível não possui cálculo consolidado para correção.");
  }
}

function valoresAtuais(linha: LinhaCorrecao): ValoresCorrecaoFinanceira {
  const parametros = resolverParametrosFinanceiros({
    valor_base: linha.valor_base_chamado,
    horas_incluidas: linha.horas_incluidas_chamado,
    valor_hora_adicional: linha.valor_hora_adicional_chamado,
  });
  return {
    valor_base: numero(linha.valor_base),
    horas_incluidas: parametros.horas_incluidas,
    valor_hora_adicional: numero(linha.valor_hora_adicional),
    horas_adicionais: Number(linha.horas_adicionais ?? 0),
    valor_adicional: numero(linha.valor_adicional),
    valor_total: numero(linha.valor_total),
    regra_preco: linha.regra_preco as ValoresCorrecaoFinanceira["regra_preco"],
  };
}

function preparar(linha: LinhaCorrecao, parametros: ParametrosCorrecaoFinanceira) {
  validarElegibilidade(linha);
  const preparado = prepararRecebivelAutomatico(
    linha.cliente,
    linha.encerrado_em,
    linha.hora_inicio_snapshot,
    linha.hora_fim_snapshot,
    parametros,
  );
  if (!preparado?.calculo || preparado.calculo.duracao_minutos !== linha.duracao_minutos) {
    throw new ConflitoCorrecaoFinanceiraError("Os snapshots financeiros não permitem uma correção segura.");
  }
  const atual = valoresAtuais(linha);
  const novo: ValoresCorrecaoFinanceira = {
    valor_base: preparado.calculo.valor_base,
    horas_incluidas: preparado.parametros.horas_incluidas,
    valor_hora_adicional: preparado.calculo.valor_hora_adicional,
    horas_adicionais: preparado.calculo.horas_adicionais,
    valor_adicional: preparado.calculo.valor_adicional,
    valor_total: preparado.calculo.valor_total,
    regra_preco: preparado.calculo.regra_preco,
  };
  const parametrosAtuais = resolverParametrosFinanceiros({
    valor_base: linha.valor_base_chamado,
    horas_incluidas: linha.horas_incluidas_chamado,
    valor_hora_adicional: linha.valor_hora_adicional_chamado,
  });
  const pares: Array<[CampoAuditoriaChamado, string | number, string | number]> = [
    ["valor_base", parametrosAtuais.valor_base, novo.valor_base],
    ["horas_incluidas", parametrosAtuais.horas_incluidas, novo.horas_incluidas],
    ["valor_hora_adicional", parametrosAtuais.valor_hora_adicional, novo.valor_hora_adicional],
    ["recebivel_valor_base", numero(linha.valor_base), novo.valor_base],
    ["recebivel_valor_hora_adicional", numero(linha.valor_hora_adicional), novo.valor_hora_adicional],
    ["recebivel_horas_adicionais", numero(linha.horas_adicionais), novo.horas_adicionais],
    ["recebivel_valor_adicional", numero(linha.valor_adicional), novo.valor_adicional],
    ["recebivel_valor_total", numero(linha.valor_total), novo.valor_total],
    ["recebivel_regra_preco", linha.regra_preco, novo.regra_preco],
  ];
  const alteracoes = pares.flatMap(([campo, anterior, proximo]) => anterior === proximo ? [] : [{
    campo,
    rotulo: ROTULOS_CAMPOS_AUDITORIA_CHAMADO[campo],
    anterior: String(anterior),
    novo: String(proximo),
  }]);
  return { atual, novo, alteracoes };
}

function montarPrevia(
  linha: LinhaCorrecao,
  parametros: ParametrosCorrecaoFinanceira,
): PreviaCorrecaoFinanceira {
  const { atual, novo, alteracoes } = preparar(linha, parametros);
  return {
    conta_id: linha.conta_id,
    chamado_id: Number(linha.chamado_id),
    numero_chamado: linha.numero_chamado,
    situacao: "A_RECEBER",
    previsao_recebimento: linha.previsao_recebimento,
    duracao_minutos: Number(linha.duracao_minutos),
    atual,
    novo,
    alteracoes,
    versao: criarVersao(linha),
  };
}

export async function prepararCorrecaoFinanceira(
  contaId: string,
  parametros: ParametrosCorrecaoFinanceira,
) {
  return observeDatabaseOperation("financeiro.prepararCorrecao", async () => {
    const sql = getSql();
    const linhas = await sql<LinhaCorrecao[]>`
      SELECT cr.id AS conta_id, cr.chamado_id, cr.numero_chamado_snapshot AS numero_chamado,
             c.cliente, c.status AS status_chamado,
             c.valor_base AS valor_base_chamado,
             c.horas_incluidas AS horas_incluidas_chamado,
             c.valor_hora_adicional AS valor_hora_adicional_chamado,
             c.atualizado_em AS atualizado_em_chamado,
             cr.encerrado_em, cr.hora_inicio_snapshot, cr.hora_fim_snapshot,
             cr.duracao_minutos, cr.horas_adicionais, cr.valor_base,
             cr.valor_hora_adicional, cr.valor_adicional, cr.valor_total,
             cr.regra_preco, cr.origem, cr.prazo_dias, cr.situacao,
             cr.revisao_pendente, cr.recebido_em, cr.valor_recebido,
             cr.atualizado_em AS atualizado_em_conta,
             TO_CHAR(
               (cr.encerrado_em AT TIME ZONE 'America/Sao_Paulo')::date + cr.prazo_dias,
               'YYYY-MM-DD'
             ) AS previsao_recebimento
      FROM contas_receber cr
      JOIN chamados c ON c.id = cr.chamado_id
      WHERE cr.id = ${contaId}
    `;
    if (!linhas[0]) throw new Error("Recebível não encontrado.");
    return montarPrevia(linhas[0], parametros);
  });
}

function valorArmazenado(
  atualArmazenado: string | null,
  atualEfetivo: number,
  novoEfetivo: number,
) {
  return atualEfetivo === novoEfetivo ? atualArmazenado : String(novoEfetivo);
}

export async function aplicarCorrecaoFinanceira(
  contaId: string,
  parametros: ParametrosCorrecaoFinanceira,
  motivo: string,
  versao: string,
) {
  return observeDatabaseOperation("financeiro.aplicarCorrecao", async () => {
    const sql = getSql();
    return sql.begin(async (transacao) => {
      const linhas = await transacao<LinhaCorrecao[]>`
        SELECT cr.id AS conta_id, cr.chamado_id, cr.numero_chamado_snapshot AS numero_chamado,
               c.cliente, c.status AS status_chamado,
               c.valor_base AS valor_base_chamado,
               c.horas_incluidas AS horas_incluidas_chamado,
               c.valor_hora_adicional AS valor_hora_adicional_chamado,
               c.atualizado_em AS atualizado_em_chamado,
               cr.encerrado_em, cr.hora_inicio_snapshot, cr.hora_fim_snapshot,
               cr.duracao_minutos, cr.horas_adicionais, cr.valor_base,
               cr.valor_hora_adicional, cr.valor_adicional, cr.valor_total,
               cr.regra_preco, cr.origem, cr.prazo_dias, cr.situacao,
               cr.revisao_pendente, cr.recebido_em, cr.valor_recebido,
               cr.atualizado_em AS atualizado_em_conta,
               TO_CHAR(
                 (cr.encerrado_em AT TIME ZONE 'America/Sao_Paulo')::date + cr.prazo_dias,
                 'YYYY-MM-DD'
               ) AS previsao_recebimento
        FROM contas_receber cr
        JOIN chamados c ON c.id = cr.chamado_id
        WHERE cr.id = ${contaId}
        FOR UPDATE OF cr, c
      `;
      const linha = linhas[0];
      if (!linha) throw new Error("Recebível não encontrado.");
      validarElegibilidade(linha);
      if (criarVersao(linha) !== versao) throw new ConflitoCorrecaoFinanceiraError();

      const previa = montarPrevia(linha, parametros);
      if (previa.alteracoes.length === 0) {
        throw new Error("Nenhuma alteração financeira efetiva foi informada.");
      }

      const valorBaseChamado = valorArmazenado(
        linha.valor_base_chamado,
        resolverParametrosFinanceiros({ valor_base: linha.valor_base_chamado }).valor_base,
        previa.novo.valor_base,
      );
      const horasIncluidasChamado = valorArmazenado(
        linha.horas_incluidas_chamado,
        resolverParametrosFinanceiros({ horas_incluidas: linha.horas_incluidas_chamado }).horas_incluidas,
        previa.novo.horas_incluidas,
      );
      const valorHoraAdicionalChamado = valorArmazenado(
        linha.valor_hora_adicional_chamado,
        resolverParametrosFinanceiros({ valor_hora_adicional: linha.valor_hora_adicional_chamado }).valor_hora_adicional,
        previa.novo.valor_hora_adicional,
      );

      await transacao`
        UPDATE chamados
        SET valor_base = ${valorBaseChamado},
            horas_incluidas = ${horasIncluidasChamado},
            valor_hora_adicional = ${valorHoraAdicionalChamado}
        WHERE id = ${linha.chamado_id}
      `;
      const atualizadas = await transacao<{ id: string }[]>`
        UPDATE contas_receber
        SET valor_base = ${previa.novo.valor_base},
            valor_hora_adicional = ${previa.novo.valor_hora_adicional},
            horas_adicionais = ${previa.novo.horas_adicionais},
            valor_adicional = ${previa.novo.valor_adicional},
            valor_total = ${previa.novo.valor_total},
            regra_preco = ${previa.novo.regra_preco},
            atualizado_em = NOW()
        WHERE id = ${contaId}
          AND situacao = 'A_RECEBER'
          AND revisao_pendente = FALSE
          AND recebido_em IS NULL
          AND valor_recebido IS NULL
        RETURNING id
      `;
      if (!atualizadas[0]) throw new ConflitoCorrecaoFinanceiraError();

      const campos = previa.alteracoes.map(({ campo }) => campo) as CampoAuditoriaChamado[];
      campos.push("motivo_correcao");
      const anteriores = Object.fromEntries(previa.alteracoes.map(({ campo, anterior }) => [campo, anterior]));
      const novos = Object.fromEntries(previa.alteracoes.map(({ campo, novo }) => [campo, novo]));
      Object.assign(anteriores, { motivo_correcao: null, recebivel_id: contaId });
      Object.assign(novos, { motivo_correcao: motivo, recebivel_id: contaId });
      await transacao`
        INSERT INTO chamados_alteracoes (
          chamado_id, origem, escopo, campos_alterados, valores_anteriores, valores_novos
        ) VALUES (
          ${linha.chamado_id}, 'EDICAO_MANUAL', 'SOMENTE_ESTA_VISITA', ${campos},
          ${transacao.json(anteriores)}, ${transacao.json(novos)}
        )
      `;
      return previa;
    });
  });
}
