import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("isolamento de RAT e Financeiro por ocorrência", () => {
  it("versiona RAT por chamado_id e usa caminho de Storage do novo ID", async () => {
    const repository = await readFile(new URL("./rat-repository.ts", import.meta.url), "utf8");
    const service = await readFile(new URL("./rat-service.ts", import.meta.url), "utf8");
    const migration = await readFile(join(process.cwd(), "supabase/migrations/20260731130000_rats.sql"), "utf8");

    expect(repository).toContain("MAX(versao)");
    expect(repository).toContain("WHERE chamado_id = ${entrada.chamado_id}");
    expect(migration).toContain("UNIQUE (chamado_id, versao)");
    expect(service).toContain("`${chamadoId}/${id}.pdf`");
  });

  it("permite um recebível independente para cada ID interno", async () => {
    const migration = await readFile(join(process.cwd(), "supabase/migrations/20260811130000_contas_receber.sql"), "utf8");
    const repository = await readFile(new URL("./financeiro-repository.ts", import.meta.url), "utf8");

    expect(migration).toContain("chamado_id BIGINT NOT NULL UNIQUE");
    expect(repository).toContain("${chamado.id}, ${chamado.numero_chamado}");
    expect(repository).toContain("ON CONFLICT (chamado_id)");
  });

  it("reabre e coloca em revisão somente o recebível da ocorrência aberta", async () => {
    const repository = await readFile(new URL("./repository.ts", import.meta.url), "utf8");
    const inicio = repository.indexOf("export async function reabrirChamado");
    const fim = repository.indexOf("export async function criarNovaVisita");
    const reabertura = repository.slice(inicio, fim);
    expect(reabertura).toContain("WHERE chamado_id = ${id} AND atual = TRUE");
    expect(reabertura).toContain("colocarContaEmRevisao(transacao, id)");
    expect(reabertura).not.toContain("chamado_raiz_id");
  });
});
