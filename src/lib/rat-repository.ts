import "server-only";

import { getSql } from "@/lib/db";
import type { RatRegistro, RatRevisao } from "@/lib/rat-types";

export async function listarRats(chamadoId: number) {
  const sql = getSql();
  return sql<RatRegistro[]>`
    SELECT id, chamado_id, versao, caminho_pdf, hash_pdf, tecnico, status_rat, atual, gerado_em, dados_revisao
    FROM rats WHERE chamado_id = ${chamadoId} ORDER BY versao DESC
  `;
}

export async function buscarRat(id: string, chamadoId: number) {
  const sql = getSql();
  const linhas = await sql<RatRegistro[]>`
    SELECT id, chamado_id, versao, caminho_pdf, hash_pdf, tecnico, status_rat, atual, gerado_em, dados_revisao
    FROM rats WHERE id = ${id} AND chamado_id = ${chamadoId}
  `;
  return linhas[0] || null;
}

export async function registrarRat(entrada: {
  id: string; chamado_id: number; caminho_pdf: string; hash_pdf: string; tecnico: string; dados_revisao: RatRevisao; gerado_em: string;
}) {
  const sql = getSql();
  return sql.begin(async (transacao) => {
    await transacao`SELECT id FROM chamados WHERE id = ${entrada.chamado_id} FOR UPDATE`;
    const versoes = await transacao<{ proxima: number }[]>`
      SELECT COALESCE(MAX(versao), 0)::int + 1 AS proxima FROM rats WHERE chamado_id = ${entrada.chamado_id}
    `;
    await transacao`
      UPDATE rats SET atual = FALSE, status_rat = 'Substituída'
      WHERE chamado_id = ${entrada.chamado_id} AND atual = TRUE
    `;
    const linhas = await transacao<RatRegistro[]>`
      INSERT INTO rats (id, chamado_id, versao, caminho_pdf, hash_pdf, tecnico, dados_revisao, gerado_em)
      VALUES (${entrada.id}, ${entrada.chamado_id}, ${versoes[0].proxima}, ${entrada.caminho_pdf},
              ${entrada.hash_pdf}, ${entrada.tecnico}, ${transacao.json(entrada.dados_revisao)}, ${entrada.gerado_em})
      RETURNING id, chamado_id, versao, caminho_pdf, hash_pdf, tecnico, status_rat, atual, gerado_em, dados_revisao
    `;
    return linhas[0];
  });
}
