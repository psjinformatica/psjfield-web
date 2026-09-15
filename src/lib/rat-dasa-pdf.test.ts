import path from "node:path";

import { PDFDocument, StandardFonts } from "pdf-lib";
import { describe, expect, it } from "vitest";

import {
  CAMINHO_TEMPLATE_RAT_DASA,
  POSICOES_MARCACOES_RAT_DASA,
  RatDasaPdfOverflowError,
  calcularLayoutTextoRatDasa,
  formatarDataRatDasaPdf,
  gerarRatDasaPdf,
  listarMarcacoesRatDasa,
} from "@/lib/rat-dasa-pdf";
import { CAMINHO_TEMPLATE_RAT_CLARO } from "@/lib/rat-pdf";
import { criarRatDasaValida } from "@/test/fixtures/rat-dasa";

const png = Uint8Array.from(Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9ZQmcAAAAASUVORK5CYII=",
  "base64",
));

describe("gerarRatDasaPdf", () => {
  it("usa o template DASA independente, nunca o template Claro", () => {
    expect(CAMINHO_TEMPLATE_RAT_DASA).toBe(path.join(process.cwd(), "Documentacao", "Modelos", "RAT_DASA_Modelo.pdf"));
    expect(CAMINHO_TEMPLATE_RAT_DASA).not.toBe(CAMINHO_TEMPLATE_RAT_CLARO);
  });

  it("gera PDF válido com exatamente uma página A4 compatível com o template", async () => {
    const bytes = await gerarRatDasaPdf(criarRatDasaValida());
    const pdf = await PDFDocument.load(bytes);

    expect(bytes.length).toBeGreaterThan(80_000);
    expect(pdf.getPageCount()).toBe(1);
    expect(pdf.getPage(0).getWidth()).toBeCloseTo(595, 2);
    expect(pdf.getPage(0).getHeight()).toBeCloseTo(842, 2);
  });

  it("gera sem assinaturas opcionais", async () => {
    const dados = criarRatDasaValida();
    dados.cliente.assinatura_cliente = null;
    dados.tecnico.assinatura_tecnico = null;

    await expect(gerarRatDasaPdf(dados)).resolves.toBeInstanceOf(Uint8Array);
  });

  it("gera prévia com metadados válidos da assinatura técnica existente", async () => {
    const dados = criarRatDasaValida();

    expect(dados.tecnico.assinatura_tecnico).toEqual({
      caminho: "tecnico/assinatura-teste.png",
      registrada_em: "2026-09-15T15:40:00.000Z",
    });
    await expect(gerarRatDasaPdf(dados, { tecnico: png })).resolves.toBeInstanceOf(Uint8Array);
  });

  it.each([
    ["cliente", { cliente: png }],
    ["técnico", { tecnico: png }],
    ["cliente e técnico", { cliente: png, tecnico: png }],
  ])("gera com assinatura de %s", async (_descricao, assinaturas) => {
    const semAssinaturas = await gerarRatDasaPdf(criarRatDasaValida());
    const comAssinaturas = await gerarRatDasaPdf(criarRatDasaValida(), assinaturas);
    expect(comAssinaturas.length).toBeGreaterThan(semAssinaturas.length);
  });

  it("mantém marcações opcionais ausentes e aplica somente as selecionadas", async () => {
    const semOpcionais = criarRatDasaValida();
    const comOpcionais = criarRatDasaValida();
    comOpcionais.equipamento.tipo = "Ponto de Rede";
    comOpcionais.atendimento.checklist_aplicado.energia = true;
    comOpcionais.atendimento.checklist_aplicado.rede_rj45 = true;
    comOpcionais.atendimento.checklist_formatacao.antes.print_area_trabalho = true;
    comOpcionais.atendimento.problema_solucionado = true;
    comOpcionais.cliente.avaliacao = "BOM";

    const vazio = await gerarRatDasaPdf(semOpcionais);
    const marcado = await gerarRatDasaPdf(comOpcionais);
    expect(marcado).not.toEqual(vazio);
    expect(POSICOES_MARCACOES_RAT_DASA.checklist_aplicado.energia).toEqual([64, 327]);
    expect(POSICOES_MARCACOES_RAT_DASA.equipamento["Ponto de Rede"]).toEqual([352, 178]);
  });

  it("não marca opções false, null ou vazias", () => {
    const dados = criarRatDasaValida();

    expect(listarMarcacoesRatDasa(dados)).toEqual([
      POSICOES_MARCACOES_RAT_DASA.atendimento.FIELD_SERVICES,
    ]);
  });

  it("marca somente opções explicitamente selecionadas", () => {
    const dados = criarRatDasaValida();
    dados.equipamento.tipo = "Ponto de Rede";
    dados.atendimento.checklist_aplicado.energia = true;
    dados.atendimento.checklist_aplicado.rede_rj45 = true;
    dados.atendimento.checklist_formatacao.antes.print_area_trabalho = true;
    dados.atendimento.problema_solucionado = true;
    dados.atendimento.visita_improdutiva = true;
    dados.laudo.laudado = true;
    dados.laudo.motivo = "DESCARTE";
    dados.cliente.avaliacao = "BOM";

    expect(listarMarcacoesRatDasa(dados)).toEqual([
      POSICOES_MARCACOES_RAT_DASA.atendimento.FIELD_SERVICES,
      POSICOES_MARCACOES_RAT_DASA.equipamento["Ponto de Rede"],
      POSICOES_MARCACOES_RAT_DASA.checklist_aplicado.energia,
      POSICOES_MARCACOES_RAT_DASA.checklist_aplicado.rede_rj45,
      POSICOES_MARCACOES_RAT_DASA.checklist_formatacao_antes.print_area_trabalho,
      POSICOES_MARCACOES_RAT_DASA.respostas.problema_solucionado,
      POSICOES_MARCACOES_RAT_DASA.respostas.visita_improdutiva,
      POSICOES_MARCACOES_RAT_DASA.respostas.laudado,
      POSICOES_MARCACOES_RAT_DASA.motivo_laudo.DESCARTE,
      POSICOES_MARCACOES_RAT_DASA.avaliacao.BOM,
    ]);
  });

  it("formata datas como DD/MM/AA e preserva horários HH:mm recebidos", () => {
    const dados = criarRatDasaValida();
    expect(formatarDataRatDasaPdf(dados.tecnico.inicio_data)).toBe("15/09/26");
    expect(dados.tecnico.inicio_hora).toBe("09:00");
    expect(dados.tecnico.termino_hora).toBe("12:40");
  });

  it("quebra texto longo em várias linhas dentro da caixa", async () => {
    const pdf = await PDFDocument.create();
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const layout = calcularLayoutTextoRatDasa(
      font,
      "Texto de diagnóstico suficientemente longo para ocupar mais de uma linha na área disponível.",
      { largura: 180, altura: 40 },
      { tamanhoMaximo: 9, tamanhoMinimo: 5.5 },
    );

    expect(layout).not.toBeNull();
    expect(layout!.linhas.length).toBeGreaterThan(1);
    expect(layout!.tamanho).toBeGreaterThanOrEqual(5.5);
  });

  it("retorna erro identificando o campo quando texto obrigatório não cabe", async () => {
    const dados = criarRatDasaValida();
    dados.atendimento.defeito_informado = "palavra ".repeat(400);

    await expect(gerarRatDasaPdf(dados)).rejects.toEqual(expect.objectContaining({
      name: "RatDasaPdfOverflowError",
      campo: "defeito informado",
    } satisfies Partial<RatDasaPdfOverflowError>));
  });
});
