import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

describe("garantias de persistência de RAT", () => {
  it("mantém bloqueio concorrente, versão sequencial e troca da atual na mesma transação", async () => {
    const fonte = await readFile(new URL("./rat-repository.ts", import.meta.url), "utf8");
    const bloqueio = fonte.indexOf("FOR UPDATE");
    const numeracao = fonte.indexOf("MAX(versao)");
    const substituicao = fonte.indexOf("UPDATE rats SET atual = FALSE");
    const insercao = fonte.indexOf("INSERT INTO rats");
    expect(fonte).toContain("sql.begin");
    expect(bloqueio).toBeGreaterThan(0);
    expect(bloqueio).toBeLessThan(numeracao);
    expect(numeracao).toBeLessThan(substituicao);
    expect(substituicao).toBeLessThan(insercao);
  });

  it("mantém upload sem sobrescrita no bucket rats", async () => {
    const fonte = await readFile(new URL("./rat-storage.ts", import.meta.url), "utf8");
    expect(fonte).toContain('.from("rats").upload');
    expect(fonte).toContain("upsert: false");
  });
});
