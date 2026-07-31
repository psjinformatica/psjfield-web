import { describe, expect, it } from "vitest";

import {
  normalizarSupabaseUrl,
  validarArquivoAssinatura,
  validarResponsavel,
  validarTecnico,
} from "@/lib/assinaturas-validation";

describe("validação de assinaturas", () => {
  it("rejeita responsável sem nome", () => {
    expect(() => validarResponsavel({ nome_responsavel: "", documento_responsavel: "" }))
      .toThrow("Informe o nome");
  });

  it("rejeita imagem vazia, tipo incorreto e conteúdo que não é PNG", () => {
    expect(() => validarArquivoAssinatura({ bytes: new Uint8Array(), tipo: "image/png", tamanho: 0 }))
      .toThrow("no máximo 2 MB");
    expect(() => validarArquivoAssinatura({ bytes: new Uint8Array([1]), tipo: "image/jpeg", tamanho: 1 }))
      .toThrow("formato PNG");
    expect(() => validarArquivoAssinatura({ bytes: new Uint8Array([1, 2, 3]), tipo: "image/png", tamanho: 3 }))
      .toThrow("PNG válido");
  });

  it("aceita PNG dentro do limite", () => {
    const bytes = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
    expect(validarArquivoAssinatura({ bytes, tipo: "image/png", tamanho: bytes.length }).bytes).toBe(bytes);
  });

  it("exige um nome configurável para o técnico", () => {
    expect(() => validarTecnico({ nome_tecnico: "" })).toThrow("nome do técnico");
    expect(validarTecnico({ nome_tecnico: "Técnica Ana" }).nome_tecnico).toBe("Técnica Ana");
  });

  it("normaliza a URL do projeto para uso seguro no Storage", () => {
    expect(normalizarSupabaseUrl("https://projeto.supabase.co/rest/v1/"))
      .toBe("https://projeto.supabase.co");
    expect(() => normalizarSupabaseUrl("http://projeto.supabase.co"))
      .toThrow("SUPABASE_URL inválida");
  });
});
