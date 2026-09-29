import { describe, expect, it } from "vitest";

import { nomeArquivoRat } from "@/lib/rat-arquivo";

describe("nomeArquivoRat", () => {
  it("gera nome identificável e acrescenta a versão após a primeira", () => {
    expect(nomeArquivoRat("MI-285611-3", 1)).toBe("RAT_MI-285611-3.pdf");
    expect(nomeArquivoRat("MI-285611-3", 2)).toBe("RAT_MI-285611-3_v2.pdf");
  });

  it("remove caracteres inseguros do nome", () => {
    expect(nomeArquivoRat("Chamado / teste", 1)).toBe("RAT_Chamado_teste.pdf");
  });

  it("distingue o arquivo compartilhado de uma visita posterior", () => {
    expect(nomeArquivoRat("SR-906366", 1, 2)).toBe("RAT_SR-906366_Visita-2.pdf");
    expect(nomeArquivoRat("SR-906366", 2, 2)).toBe("RAT_SR-906366_Visita-2_v2.pdf");
  });
});
