import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("consulta da listagem de chamados", () => {
  it("traz valor_total junto com os chamados sem consulta N+1", async () => {
    const fonte = await readFile(new URL("./repository.ts", import.meta.url), "utf8");
    const inicio = fonte.indexOf("export async function listarChamados");
    const fim = fonte.indexOf("export async function buscarChamado");
    const listagem = fonte.slice(inicio, fim);

    expect(listagem).toContain("LEFT JOIN contas_receber cr ON cr.chamado_id = c.id");
    expect(listagem).toContain("cr.valor_total AS valor_financeiro");
    expect(listagem.match(/await sql</g)).toHaveLength(1);
    expect(listagem).not.toContain("valor_recebido");
  });
});
