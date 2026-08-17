import "server-only";

import type { AssinaturaCliente, AssinaturaTecnico } from "@/lib/assinaturas-types";
import { getSql } from "@/lib/db";
import { observeDatabaseOperation } from "@/lib/db-observability";

export async function buscarAssinaturaCliente(chamadoId: number) {
  return observeDatabaseOperation("assinaturas.buscarCliente", async () => {
    const sql = getSql();
    const linhas = await sql<AssinaturaCliente[]>`
    SELECT chamado_id, nome_responsavel, documento_responsavel, caminho_assinatura,
           assinado_em, atualizado_em
    FROM assinaturas_cliente
    WHERE chamado_id = ${chamadoId}
  `;
    return linhas[0] ? { ...linhas[0], chamado_id: Number(linhas[0].chamado_id) } : null;
  });
}

export async function salvarAssinaturaCliente(assinatura: AssinaturaCliente) {
  const sql = getSql();
  await sql`
    INSERT INTO assinaturas_cliente
      (chamado_id, nome_responsavel, documento_responsavel, caminho_assinatura,
       assinado_em, atualizado_em)
    VALUES
      (${assinatura.chamado_id}, ${assinatura.nome_responsavel},
       ${assinatura.documento_responsavel}, ${assinatura.caminho_assinatura},
       ${assinatura.assinado_em}, ${assinatura.atualizado_em})
    ON CONFLICT (chamado_id) DO UPDATE SET
      nome_responsavel = EXCLUDED.nome_responsavel,
      documento_responsavel = EXCLUDED.documento_responsavel,
      caminho_assinatura = EXCLUDED.caminho_assinatura,
      assinado_em = EXCLUDED.assinado_em,
      atualizado_em = EXCLUDED.atualizado_em
  `;
}

export async function buscarAssinaturaTecnico() {
  return observeDatabaseOperation("assinaturas.buscarTecnico", async () => {
    const sql = getSql();
    const linhas = await sql<AssinaturaTecnico[]>`
    SELECT id, nome_tecnico, caminho_assinatura, atualizado_em
    FROM assinatura_tecnico
    WHERE id = 1
  `;
    return linhas[0] ? { ...linhas[0], id: Number(linhas[0].id) } : null;
  });
}

export async function salvarAssinaturaTecnico(assinatura: AssinaturaTecnico) {
  const sql = getSql();
  await sql`
    INSERT INTO assinatura_tecnico (id, nome_tecnico, caminho_assinatura, atualizado_em)
    VALUES (${assinatura.id}, ${assinatura.nome_tecnico}, ${assinatura.caminho_assinatura},
            ${assinatura.atualizado_em})
    ON CONFLICT (id) DO UPDATE SET
      nome_tecnico = EXCLUDED.nome_tecnico,
      caminho_assinatura = EXCLUDED.caminho_assinatura,
      atualizado_em = EXCLUDED.atualizado_em
  `;
}

export async function registrarPendenciaStorage(caminho: string, motivo: string) {
  const sql = getSql();
  await sql`
    INSERT INTO pendencias_storage (bucket, caminho, motivo)
    VALUES ('assinaturas', ${caminho}, ${motivo})
  `;
}
