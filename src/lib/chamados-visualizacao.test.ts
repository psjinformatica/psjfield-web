import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("persistência global da visualização de chamados", () => {
  it("mantém a primeira visualização com update idempotente", async () => {
    const fonte = await readFile(new URL("./repository.ts", import.meta.url), "utf8");
    expect(fonte).toMatch(/SET visualizado_em = NOW\(\)/);
    expect(fonte).toMatch(/WHERE id = \$\{id\} AND visualizado_em IS NULL/);
  });

  it("prepara backfill dos históricos e mantém novos chamados como não visualizados", async () => {
    const migration = await readFile(
      new URL("../../supabase/migrations/20260915220000_chamados_visualizacao.sql", import.meta.url),
      "utf8",
    );
    expect(migration).toMatch(/ADD COLUMN visualizado_em TIMESTAMPTZ;/);
    expect(migration).toMatch(/UPDATE chamados[\s\S]*SET visualizado_em = NOW\(\)[\s\S]*WHERE visualizado_em IS NULL;/);
    expect(migration).not.toMatch(/visualizado_em TIMESTAMPTZ[^;]*DEFAULT/i);
  });

  it("marca somente depois que o detalhe monta e invalida a listagem", async () => {
    const marcador = await readFile(
      new URL("../components/marcar-chamado-acessado.tsx", import.meta.url),
      "utf8",
    );
    const actions = await readFile(new URL("../app/actions.ts", import.meta.url), "utf8");
    expect(marcador).toMatch(/useEffect\(\(\) => \{[\s\S]*marcarChamadoVisualizadoAction\(id\)/);
    expect(actions).toMatch(/marcarVisualizado\(id\)[\s\S]*revalidatePath\("\/"\)/);
  });

  it("não usa clique nem armazenamento local como fonte de verdade", async () => {
    const lista = await readFile(
      new URL("../components/chamados-lista.tsx", import.meta.url),
      "utf8",
    );
    expect(lista).not.toMatch(/marcarComoAcessado|localStorage|sessionStorage|chamados-acessados/);
    expect(lista).toMatch(/chamado\.visualizado_em === null/);
  });
});
