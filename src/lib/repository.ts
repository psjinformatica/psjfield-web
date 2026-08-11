import "server-only";

import { getSql } from "@/lib/db";
import type {
  AtendimentoInput,
  AtendimentoAtualizado,
  Chamado,
  ChamadoDuplicado,
  ChamadoImportacao,
  ChamadoResumo,
  ChamadoFinalizado,
  FinalizacaoInput,
  ChamadoReaberto,
  ReaberturaInput,
} from "@/lib/types";
import { horarioAtualSaoPaulo, statusEncerraAtendimento, statusGeraRecebimento } from "@/lib/status";
import { colocarContaEmRevisao, registrarContaAutomatica } from "@/lib/financeiro-repository";

export async function listarChamados(): Promise<ChamadoResumo[]> {
  const sql = getSql();
  const linhas = await sql<ChamadoResumo[]>`
    SELECT id, numero_chamado, status, data_agendada, hora_agendada,
           cliente, projeto, cidade, estado, atividade, valor_base
    FROM chamados
    ORDER BY NULLIF(data_agendada, '') DESC NULLS LAST,
             NULLIF(hora_agendada, '') DESC NULLS LAST,
             id DESC
  `;
  return linhas.map((linha) => ({ ...linha, id: Number(linha.id) }));
}

export async function buscarChamado(id: number): Promise<Chamado | null> {
  const sql = getSql();
  const linhas = await sql<Chamado[]>`
    SELECT id, numero_chamado, empresa_parceira, cliente, projeto, assunto_email,
           remetente, destinatario, data_email, data_agendada, hora_agendada,
           usuario_responsavel, contato, telefone, endereco, cidade, estado,
           atividade, descricao, equipamento, fabricante, modelo, patrimonio_ae,
           numero_serie, valor_base, horas_incluidas, valor_hora_adicional,
           status, observacoes, hora_chegada, hora_inicio, hora_termino,
           descricao_servico, observacoes_atendimento
    FROM chamados WHERE id = ${id}
  `;
  return linhas[0] ? { ...linhas[0], id: Number(linhas[0].id) } : null;
}

export async function atualizarAtendimento(id: number, dados: AtendimentoInput): Promise<AtendimentoAtualizado> {
  const sql = getSql();
  return sql.begin(async (transacao) => {
    const atuais = await transacao<{ status: string; hora_inicio: string }[]>`
      SELECT status, hora_inicio FROM chamados WHERE id = ${id} FOR UPDATE
    `;
    const atual = atuais[0];
    if (!atual) throw new Error("Chamado não encontrado.");
    const horaInicioAnterior = atual.hora_inicio || "";
    if (
      horaInicioAnterior
      && horaInicioAnterior !== dados.hora_inicio
      && !dados.confirmar_alteracao_hora_inicio
    ) {
      throw new Error("Confirme a alteração do horário de início.");
    }
    const status = atual.status === "Agendado" && dados.hora_inicio
      ? "Em atendimento"
      : atual.status;
    const linhas = await transacao<AtendimentoAtualizado[]>`
      UPDATE chamados
      SET hora_chegada = ${dados.hora_chegada},
          hora_inicio = ${dados.hora_inicio},
          hora_termino = ${dados.hora_termino},
          descricao_servico = ${dados.descricao_servico},
          observacoes_atendimento = ${dados.observacoes_atendimento},
          status = ${status},
          atualizado_em = ${new Date().toISOString()}
      WHERE id = ${id}
      RETURNING status, hora_inicio
    `;
    return linhas[0];
  });
}

export async function finalizarChamado(
  id: number,
  dados: FinalizacaoInput,
): Promise<ChamadoFinalizado> {
  const sql = getSql();
  return sql.begin(async (transacao) => {
    const atuais = await transacao<{
      id: number;
      numero_chamado: string;
      status: string;
      hora_inicio: string;
      hora_termino: string;
      observacoes_atendimento: string;
    }[]>`
      SELECT id, numero_chamado, status, hora_inicio, hora_termino, observacoes_atendimento
      FROM chamados WHERE id = ${id} FOR UPDATE
    `;
    const atual = atuais[0];
    if (!atual) throw new Error("Chamado não encontrado.");
    if (statusEncerraAtendimento(atual.status)) {
      throw new Error(`O chamado já está finalizado como ${atual.status}.`);
    }
    const horaTermino = atual.hora_termino || horarioAtualSaoPaulo();
    const observacoes = dados.motivo
      ? [atual.observacoes_atendimento, `Motivo da finalização (${dados.status}): ${dados.motivo}`]
          .filter(Boolean)
          .join("\n")
      : atual.observacoes_atendimento;
    const encerradoEm = new Date().toISOString();
    const linhas = await transacao<{ status: FinalizacaoInput["status"]; hora_termino: string }[]>`
      UPDATE chamados
      SET status = ${dados.status},
          hora_termino = ${horaTermino},
          observacoes_atendimento = ${observacoes},
          atualizado_em = ${encerradoEm}
      WHERE id = ${id}
      RETURNING status, hora_termino
    `;
    if (statusGeraRecebimento(linhas[0].status)) {
      await registrarContaAutomatica(transacao, {
        id: Number(atual.id),
        numero_chamado: atual.numero_chamado,
        hora_inicio: atual.hora_inicio,
        hora_termino: linhas[0].hora_termino,
      }, encerradoEm);
    } else {
      await colocarContaEmRevisao(transacao, id);
    }
    return {
      ...linhas[0],
      gera_recebimento: statusGeraRecebimento(linhas[0].status),
    };
  });
}

export async function reabrirChamado(
  id: number,
  dados: ReaberturaInput,
): Promise<ChamadoReaberto> {
  const sql = getSql();
  return sql.begin(async (transacao) => {
    const atuais = await transacao<{ status: string }[]>`
      SELECT status FROM chamados WHERE id = ${id} FOR UPDATE
    `;
    const atual = atuais[0];
    if (!atual) throw new Error("Chamado não encontrado.");
    if (!statusEncerraAtendimento(atual.status)) {
      throw new Error(`Não é possível reabrir um chamado com status ${atual.status}.`);
    }
    const reabertoEm = new Date().toISOString();
    await transacao`
      INSERT INTO reaberturas_atendimento
        (chamado_id, status_anterior, motivo, reaberto_em)
      VALUES
        (${id}, ${atual.status}, ${dados.motivo}, ${reabertoEm})
    `;
    await transacao`
      UPDATE rats SET atual = FALSE, status_rat = 'Substituída'
      WHERE chamado_id = ${id} AND atual = TRUE
    `;
    await colocarContaEmRevisao(transacao, id);
    const linhas = await transacao<{ status: "Em atendimento" }[]>`
      UPDATE chamados
      SET status = 'Em atendimento', atualizado_em = ${reabertoEm}
      WHERE id = ${id}
      RETURNING status
    `;
    return { status: linhas[0].status, reaberto_em: reabertoEm };
  });
}

export async function buscarPorHash(hash: string) {
  const sql = getSql();
  const linhas = await sql<ChamadoDuplicado[]>`
    SELECT e.chamado_id, c.numero_chamado, c.cliente, c.cidade, c.estado,
           e.importado_em
    FROM emails_importados e
    JOIN chamados c ON c.id = e.chamado_id
    WHERE e.hash_email = ${hash}
  `;
  return linhas[0] ? { ...linhas[0], chamado_id: Number(linhas[0].chamado_id) } : null;
}

const colunasImportacao = [
  "numero_chamado", "empresa_parceira", "cliente", "projeto", "assunto_email",
  "remetente", "destinatario", "data_email", "data_agendada", "hora_agendada",
  "usuario_responsavel", "contato", "telefone", "endereco", "cidade", "estado",
  "atividade", "descricao", "equipamento", "fabricante", "modelo", "patrimonio_ae",
  "numero_serie", "valor_base", "horas_incluidas", "valor_hora_adicional", "status",
  "observacoes", "caminho_email", "hash_email", "corpo_email", "criado_em", "atualizado_em",
] as const;

export async function importarChamado(chamado: ChamadoImportacao, nomeArquivo: string) {
  const sql = getSql();
  return sql.begin(async (transacao) => {
    const duplicados = await transacao<{ chamado_id: number }[]>`
      SELECT chamado_id FROM emails_importados WHERE hash_email = ${chamado.hash_email}
    `;
    if (duplicados[0]) throw new Error("Este e-mail já foi importado.");
    const valores = Object.fromEntries(colunasImportacao.map((coluna) => [coluna, chamado[coluna]]));
    const inseridos = await transacao<{ id: number }[]>`
      INSERT INTO chamados ${transacao(valores, ...colunasImportacao)}
      RETURNING id
    `;
    const id = inseridos[0].id;
    await transacao`
      INSERT INTO emails_importados
        (hash_email, chamado_id, nome_arquivo, caminho_email, importado_em)
      VALUES
        (${chamado.hash_email}, ${id}, ${nomeArquivo}, '', ${chamado.criado_em})
    `;
    return Number(id);
  });
}

export async function excluirChamado(id: number) {
  const sql = getSql();
  return sql.begin(async (transacao) => {
    const chamados = await transacao<{ id: number; hash_email: string }[]>`
      SELECT id, hash_email FROM chamados WHERE id = ${id} FOR UPDATE
    `;
    const chamado = chamados[0];
    if (!chamado) throw new Error("Chamado não encontrado.");
    const emails = await transacao`
      DELETE FROM emails_importados
      WHERE chamado_id = ${id} AND hash_email = ${chamado.hash_email}
      RETURNING id
    `;
    if (emails.count !== 1) throw new Error("Vínculo do e-mail não encontrado.");
    const removidos = await transacao`
      DELETE FROM chamados WHERE id = ${id} AND hash_email = ${chamado.hash_email}
      RETURNING id
    `;
    if (removidos.count !== 1) throw new Error("Não foi possível excluir o chamado.");
  });
}
