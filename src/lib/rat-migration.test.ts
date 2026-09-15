import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

const caminho = new URL("../../supabase/migrations/20260915190000_rats_modelos.sql", import.meta.url);

describe("migration de modelos RAT", () => {
  it("adiciona metadados retrocompatíveis e identifica históricos como Claro V1", async () => {
    const sql = await readFile(caminho, "utf8");
    expect(sql).toMatch(/modelo_rat TEXT NOT NULL DEFAULT 'claro'/);
    expect(sql).toMatch(/modelo_versao INTEGER NOT NULL DEFAULT 1/);
    expect(sql).toMatch(/schema_versao INTEGER NOT NULL DEFAULT 1/);
    expect(sql).toContain("1cb582e940b46a0f956d7badba83fdcb0148aacbac5038ad641f0fbc5cbc87d2");
    expect(sql).toMatch(/assinaturas_snapshot JSONB NOT NULL DEFAULT '\{\}'::jsonb/);
  });

  it("não altera nem regenera PDFs históricos", async () => {
    const sql = await readFile(caminho, "utf8");
    expect(sql).not.toMatch(/UPDATE\s+rats/i);
    expect(sql).not.toMatch(/DELETE\s+FROM\s+rats/i);
    expect(sql).not.toMatch(/caminho_pdf\s*=/i);
    expect(sql).not.toMatch(/hash_pdf\s*=/i);
  });

  it("valida modelo, versões, SHA-256 e snapshot objeto", async () => {
    const sql = await readFile(caminho, "utf8");
    expect(sql).toContain("modelo_rat IN ('claro', 'dasa')");
    expect(sql).toContain("template_hash ~ '^[0-9a-f]{64}$'");
    expect(sql).toContain("jsonb_typeof(assinaturas_snapshot) = 'object'");
    expect(sql).toContain("idx_rats_chamado_modelo_versao");
  });

  it("torna imutáveis o PDF, o snapshot e a identidade depois da emissão", async () => {
    const sql = await readFile(caminho, "utf8");
    expect(sql).toContain("proteger_conteudo_rat_emitida");
    expect(sql).toContain("NEW.dados_revisao IS DISTINCT FROM OLD.dados_revisao");
    expect(sql).toContain("NEW.template_hash IS DISTINCT FROM OLD.template_hash");
    expect(sql).toContain("NEW.assinaturas_snapshot IS DISTINCT FROM OLD.assinaturas_snapshot");
    expect(sql).toContain("BEFORE UPDATE ON rats");
  });
});
