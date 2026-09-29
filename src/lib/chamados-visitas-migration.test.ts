import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const caminho = join(process.cwd(), "supabase/migrations/20260928230000_chamados_multiplas_visitas.sql");

describe("migration de múltiplas visitas", () => {
  it("é transacional, retrocompatível e protege a raiz lógica", async () => {
    const sql = await readFile(caminho, "utf8");
    expect(sql.trim()).toMatch(/^BEGIN;[\s\S]*COMMIT;$/);
    expect(sql).toContain("visita_numero INTEGER NOT NULL DEFAULT 1");
    expect(sql).toContain("chamado_raiz_id BIGINT NULL");
    expect(sql).toContain("CHECK (visita_numero > 0)");
    expect(sql).toContain("REFERENCES public.chamados(id)");
    expect(sql).toContain("ON DELETE RESTRICT");
    expect(sql).toContain("COALESCE(chamado_raiz_id, id)");
    expect(sql).not.toMatch(/\bUPDATE\s+public\.chamados\b/i);
  });
});
