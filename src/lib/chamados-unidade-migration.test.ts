import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  join(process.cwd(), "supabase/migrations/20260928220000_chamados_unidade_nome.sql"),
  "utf8",
);

describe("migration de unidade do chamado", () => {
  it("adiciona somente a coluna nullable sem default nem backfill", () => {
    expect(migration).toMatch(/^BEGIN;/);
    expect(migration).toMatch(/ALTER TABLE chamados\s+ADD COLUMN unidade_nome TEXT;/);
    expect(migration).toMatch(/COMMIT;\s*$/);
    expect(migration).not.toMatch(/NOT NULL|DEFAULT|UPDATE|INSERT|DELETE/i);
  });
});
