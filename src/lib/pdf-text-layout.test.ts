import { PDFDocument, StandardFonts } from "pdf-lib";
import { beforeAll, describe, expect, it } from "vitest";

import { calcularLayoutTextoPdf, quebrarTextoPdf } from "@/lib/pdf-text-layout";

let font: Awaited<ReturnType<PDFDocument["embedFont"]>>;

beforeAll(async () => {
  const pdf = await PDFDocument.create();
  font = await pdf.embedFont(StandardFonts.Helvetica);
});

const opcoes = { tamanhoInicial: 9, tamanhoMinimo: 6, maximoLinhas: 3, entrelinha: 1.1 };

describe("layout compartilhado de texto em PDF", () => {
  it.each([
    ["texto curto", 1],
    ["texto suficiente para quebrar naturalmente em duas linhas", 2],
    ["texto maior que utiliza as três linhas físicas disponíveis antes de reduzir a fonte", 3],
  ])("aceita conteúdo medido por linhas físicas", (texto, linhasEsperadas) => {
    const layout = calcularLayoutTextoPdf(font, texto, { largura: 150, altura: 30 }, opcoes);
    expect(layout?.linhas).toHaveLength(linhasEsperadas);
    expect(layout?.tamanho).toBe(9);
  });

  it("reduz a fonte somente depois de usar todas as linhas no tamanho inicial", () => {
    const texto = "palavra ".repeat(14).trim();
    const layout = calcularLayoutTextoPdf(font, texto, { largura: 130, altura: 24 }, opcoes);
    expect(quebrarTextoPdf(font, texto, 9, 130).length).toBeGreaterThan(3);
    expect(layout?.tamanho).toBeLessThan(9);
    expect(layout?.linhas.length).toBeLessThanOrEqual(3);
  });

  it("preserva palavras comuns inteiras e rejeita overflow real sem truncar", () => {
    const texto = "diagnóstico registrado com conectividade validada";
    expect(quebrarTextoPdf(font, texto, 9, 90).join(" ")).toBe(texto);
    expect(calcularLayoutTextoPdf(font, "conteúdo ".repeat(100), { largura: 90, altura: 24 }, opcoes)).toBeNull();
  });
});
