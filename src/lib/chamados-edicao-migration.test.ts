import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("migration de auditoria da edição de chamados", () => {
  it("é transacional, auditável e acompanha exclusões legítimas", async () => {
    const sql = await readFile(new URL("../../supabase/migrations/20260929200000_chamados_alteracoes.sql", import.meta.url), "utf8");
    expect(sql.trimStart().startsWith("BEGIN;")).toBe(true);
    expect(sql.trimEnd().endsWith("COMMIT;")).toBe(true);
    expect(sql).toContain("CREATE TABLE public.chamados_alteracoes");
    expect(sql).toContain("REFERENCES public.chamados(id)");
    expect(sql).toContain("ON DELETE CASCADE");
    expect(sql).toContain("valores_anteriores JSONB NOT NULL");
    expect(sql).toContain("valores_novos JSONB NOT NULL");
    expect(sql).toContain("idx_chamados_alteracoes_chamado_data");
    expect(sql).toContain("ENABLE ROW LEVEL SECURITY");
    expect(sql).toContain("FROM PUBLIC, anon, authenticated, service_role");
    expect(sql).not.toMatch(/ALTER TABLE public\.chamados(?!_alteracoes)/);
  });
});
