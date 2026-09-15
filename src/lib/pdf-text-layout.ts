import type { PDFFont } from "pdf-lib";

export type AreaTextoPdf = { largura: number; altura: number };

export type OpcoesLayoutTextoPdf = {
  tamanhoInicial: number;
  tamanhoMinimo: number;
  maximoLinhas: number;
  entrelinha?: number;
  decremento?: number;
  fatorLarguraPreferida?: number;
};

export type LayoutTextoPdf = {
  linhas: string[];
  tamanho: number;
  entrelinha: number;
};

function dividirPalavra(font: PDFFont, palavra: string, tamanho: number, largura: number) {
  const partes: string[] = [];
  let parte = "";
  for (const caractere of palavra) {
    const candidata = parte + caractere;
    if (parte && font.widthOfTextAtSize(candidata, tamanho) > largura) {
      partes.push(parte);
      parte = caractere;
    } else {
      parte = candidata;
    }
  }
  if (parte) partes.push(parte);
  return partes;
}

export function quebrarTextoPdf(font: PDFFont, valor: string, tamanho: number, largura: number) {
  const linhas: string[] = [];
  for (const paragrafo of valor.replace(/\r\n?/g, "\n").split("\n")) {
    if (!paragrafo.trim()) {
      linhas.push("");
      continue;
    }
    let atual = "";
    for (const palavraOriginal of paragrafo.trim().split(/\s+/)) {
      const palavras = font.widthOfTextAtSize(palavraOriginal, tamanho) > largura
        ? dividirPalavra(font, palavraOriginal, tamanho, largura)
        : [palavraOriginal];
      for (const palavra of palavras) {
        const candidata = atual ? `${atual} ${palavra}` : palavra;
        if (atual && font.widthOfTextAtSize(candidata, tamanho) > largura) {
          linhas.push(atual);
          atual = palavra;
        } else {
          atual = candidata;
        }
      }
    }
    if (atual) linhas.push(atual);
  }
  return linhas;
}

export function calcularLayoutTextoPdf(
  font: PDFFont,
  valor: string,
  area: AreaTextoPdf,
  opcoes: OpcoesLayoutTextoPdf,
): LayoutTextoPdf | null {
  const entrelinha = opcoes.entrelinha ?? 1.18;
  const decremento = opcoes.decremento ?? 0.5;
  const fatorPreferido = opcoes.fatorLarguraPreferida ?? 1;
  const larguras = fatorPreferido < 1 ? [area.largura * fatorPreferido, area.largura] : [area.largura];

  for (let tamanho = opcoes.tamanhoInicial; tamanho >= opcoes.tamanhoMinimo; tamanho -= decremento) {
    const linhasFisicas = Math.min(
      opcoes.maximoLinhas,
      Math.floor((area.altura + 0.01) / (tamanho * entrelinha)),
    );
    for (const largura of larguras) {
      const linhas = quebrarTextoPdf(font, valor, tamanho, largura);
      if (linhas.length <= linhasFisicas) return { linhas, tamanho, entrelinha };
    }
  }
  return null;
}
