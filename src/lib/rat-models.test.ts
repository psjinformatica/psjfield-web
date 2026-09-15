import { describe, expect, it } from "vitest";

import {
  exigirModeloRatImplementado,
  mensagemModeloRatIndisponivel,
  modeloRatImplementado,
  normalizarClienteRat,
  resolverModeloRat,
} from "@/lib/rat-models";

describe("resolverModeloRat", () => {
  it.each([
    "DASA",
    "dasa",
    "  DaSa  ",
    "DASA   S.A",
    "DASA S/A",
    "Diagnósticos da América",
    "  DIAGNÓSTICOS   DA   AMÉRICA   S A  ",
  ])("resolve %j como dasa-v1", (cliente) => {
    expect(resolverModeloRat({ cliente })).toBe("dasa-v1");
  });

  it("resolve a fixture segura equivalente ao chamado 20 como dasa-v1", () => {
    const chamado20 = { id: 20, numero_chamado: "SR-855635", cliente: "DASA" };

    expect(resolverModeloRat(chamado20)).toBe("dasa-v1");
  });

  it.each(["Claro", "CLARO", "Cliente atual", "Cliente desconhecido", ""]) (
    "mantém %j no fallback claro-v1",
    (cliente) => {
      expect(resolverModeloRat({ cliente })).toBe("claro-v1");
    },
  );

  it("normaliza caixa, espaços e acentos em um único ponto", () => {
    expect(normalizarClienteRat("  Diagnósticos   da   América  ")).toBe("diagnosticos da america");
  });
});

describe("disponibilidade dos modelos de RAT", () => {
  it("mantém claro-v1 implementado", () => {
    expect(modeloRatImplementado("claro-v1")).toBe(true);
    expect(() => exigirModeloRatImplementado("claro-v1")).not.toThrow();
  });

  it("reconhece dasa-v1 implementado, mantendo mensagem histórica disponível", () => {
    expect(modeloRatImplementado("dasa-v1")).toBe(true);
    expect(mensagemModeloRatIndisponivel("dasa-v1")).toBe("Modelo RAT DASA em preparação");
    expect(() => exigirModeloRatImplementado("dasa-v1")).not.toThrow();
  });
});
