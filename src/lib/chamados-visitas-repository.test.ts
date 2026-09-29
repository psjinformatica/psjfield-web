import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("persistência de visitas", () => {
  it("serializa pela raiz, calcula a próxima visita e não duplica o e-mail importado", async () => {
    const fonte = await readFile(new URL("./repository.ts", import.meta.url), "utf8");
    const inicio = fonte.indexOf("export async function criarNovaVisita");
    const fim = fonte.indexOf("export async function buscarPorHash");
    const criacao = fonte.slice(inicio, fim);

    expect(criacao).toContain("WHERE id = ${raizId} FOR UPDATE");
    expect(criacao).toContain("MAX(visita_numero)");
    expect(criacao.indexOf("FOR UPDATE")).toBeLessThan(criacao.indexOf("MAX(visita_numero)"));
    expect(criacao).toContain("'Agendado'");
    expect(criacao).not.toContain("INSERT INTO emails_importados");
    const insercao = criacao.slice(criacao.indexOf("INSERT INTO chamados"));
    expect(insercao).not.toContain("hora_inicio");
    expect(insercao).not.toContain("descricao_servico,");
  });

  it("só remove o vínculo de e-mail da visita original", async () => {
    const fonte = await readFile(new URL("./repository.ts", import.meta.url), "utf8");
    const exclusao = fonte.slice(fonte.indexOf("export async function excluirChamado"));
    expect(exclusao).toContain("Number(chamado.visita_numero) === 1");
    expect(exclusao).toContain("DELETE FROM emails_importados");
  });
});
