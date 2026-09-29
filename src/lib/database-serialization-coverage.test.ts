import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

function corpoFuncao(fonte: string, nome: string) {
  const inicio = fonte.indexOf(`export async function ${nome}`);
  if (inicio < 0) throw new Error(`Função ${nome} não encontrada.`);
  const proxima = fonte.indexOf("export async function ", inicio + 1);
  return fonte.slice(inicio, proxima < 0 ? undefined : proxima);
}

describe("cobertura da serialização central do banco", () => {
  it("protege as unidades transacionais críticas uma única vez por operação pública", async () => {
    const repository = await readFile(new URL("./repository.ts", import.meta.url), "utf8");
    const rats = await readFile(new URL("./rat-repository.ts", import.meta.url), "utf8");
    const operacoes = [
      [corpoFuncao(repository, "importarChamado"), "importacao.confirmar"],
      [corpoFuncao(repository, "finalizarChamado"), "atendimento.finalizar"],
      [corpoFuncao(repository, "criarNovaVisita"), "chamados.criarVisita"],
      [corpoFuncao(rats, "registrarRat"), "rats.registrarVersao"],
    ] as const;

    for (const [corpo, nome] of operacoes) {
      expect(corpo).toContain(`observeDatabaseOperation("${nome}"`);
      expect(corpo).toContain("sql.begin");
      expect(corpo.match(/observeDatabaseOperation\(/g)).toHaveLength(1);
    }
  });

  it("mantém o Financeiro dentro da transação de finalização e serializa operações públicas", async () => {
    const repository = await readFile(new URL("./repository.ts", import.meta.url), "utf8");
    const financeiro = await readFile(new URL("./financeiro-repository.ts", import.meta.url), "utf8");
    const finalizar = corpoFuncao(repository, "finalizarChamado");
    expect(finalizar).toContain("registrarContaAutomatica(transacao");
    expect(corpoFuncao(financeiro, "listarContasReceber")).toContain("observeDatabaseOperation(\"financeiro.listar\"");
    expect(corpoFuncao(financeiro, "marcarContaRecebida")).toContain("observeDatabaseOperation(\"financeiro.marcarRecebida\"");
  });

  it("não deixa acessos diretos restantes fora do wrapper nos repositories", async () => {
    const arquivos = ["repository.ts", "rat-repository.ts", "financeiro-repository.ts", "assinaturas-repository.ts"];
    for (const arquivo of arquivos) {
      const fonte = await readFile(new URL(`./${arquivo}`, import.meta.url), "utf8");
      const funcoes = fonte.split(/(?=export async function )/).filter((trecho) => trecho.startsWith("export async function "));
      for (const funcao of funcoes.filter((trecho) => trecho.includes("getSql()"))) {
        expect(funcao, arquivo).toContain("observeDatabaseOperation(");
      }
    }
  });
});
