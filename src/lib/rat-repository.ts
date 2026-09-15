import "server-only";

import { getSql } from "@/lib/db";
import { observeDatabaseOperation } from "@/lib/db-observability";
import type { RatAssinaturasSnapshot, RatDadosRevisao, RatModeloPersistido, RatRegistro } from "@/lib/rat-types";

export async function listarRats(chamadoId: number) {
  return observeDatabaseOperation("rats.listarPorChamado", async () => {
    const sql = getSql();
    return sql<RatRegistro[]>`
    SELECT id, chamado_id, versao, caminho_pdf, hash_pdf, tecnico, status_rat, atual, gerado_em,
           dados_revisao, modelo_rat, modelo_versao, schema_versao, template_hash, assinaturas_snapshot
    FROM rats WHERE chamado_id = ${chamadoId} ORDER BY versao DESC
    `;
  });
}

export async function buscarRat(id: string, chamadoId: number) {
  return observeDatabaseOperation("rats.buscarVersao", async () => {
    const sql = getSql();
    const linhas = await sql<RatRegistro[]>`
    SELECT id, chamado_id, versao, caminho_pdf, hash_pdf, tecnico, status_rat, atual, gerado_em,
           dados_revisao, modelo_rat, modelo_versao, schema_versao, template_hash, assinaturas_snapshot
    FROM rats WHERE id = ${id} AND chamado_id = ${chamadoId}
  `;
    return linhas[0] || null;
  });
}

export async function registrarRat(entrada: {
  id: string; chamado_id: number; caminho_pdf: string; hash_pdf: string; tecnico: string;
  dados_revisao: RatDadosRevisao; gerado_em: string; modelo_rat: RatModeloPersistido;
  modelo_versao: number; schema_versao: number; template_hash: string;
  assinaturas_snapshot: RatAssinaturasSnapshot;
}) {
  return observeDatabaseOperation("rats.registrarVersao", async () => {
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
      INSERT INTO rats (
        id, chamado_id, versao, caminho_pdf, hash_pdf, tecnico, dados_revisao, gerado_em,
        modelo_rat, modelo_versao, schema_versao, template_hash, assinaturas_snapshot
      )
      VALUES (${entrada.id}, ${entrada.chamado_id}, ${versoes[0].proxima}, ${entrada.caminho_pdf},
              ${entrada.hash_pdf}, ${entrada.tecnico}, ${transacao.json(entrada.dados_revisao)}, ${entrada.gerado_em},
              ${entrada.modelo_rat}, ${entrada.modelo_versao}, ${entrada.schema_versao}, ${entrada.template_hash},
              ${transacao.json(entrada.assinaturas_snapshot)})
      RETURNING id, chamado_id, versao, caminho_pdf, hash_pdf, tecnico, status_rat, atual, gerado_em,
                dados_revisao, modelo_rat, modelo_versao, schema_versao, template_hash, assinaturas_snapshot
    `;
    return linhas[0];
    });
  });
}
