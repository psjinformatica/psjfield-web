import { PDFDocument, PDFName } from "pdf-lib";
import { describe, expect, it } from "vitest";

import { gerarRatPdf } from "@/lib/rat-pdf";
import type { RatRevisao } from "@/lib/rat-types";

const vazia: RatRevisao = {
  chamado: "MI-TESTE", data_inicio: "31/07/2026", hora_inicio: "09:00", data_fim: "31/07/2026", hora_fim: "10:00",
  login: "", colaborador: "Responsável", telefone: "", email: "", localidade: "Curitiba/PR", tipos_ocorrencia: ["Manutenção"],
  tipo_equipamento: "Notebook", outro_equipamento: "", dominio: "", atual_serial: "S1", atual_ae: "AE1", atual_fabricante: "Dell", atual_modelo: "5400",
  atual_processador: "", atual_hd: "", atual_hostname: "", atual_memoria: "", novo_serial: "", novo_ae: "", novo_fabricante: "", novo_modelo: "",
  novo_processador: "", novo_hd: "", novo_hostname: "", novo_memoria: "", pasta_perfil_pst: "", software: "", itens_afetados: [],
  memoria_frequencia: "", item_outros: "", part_number: "", centro_custo: "", diagnosticos: [], diagnostico_outros: "", descricao: "Configuração concluída com caracteres acentuados e quebra de linha. ".repeat(8),
  status_equipamento: ["Equipamento OK"], condicao_equipamento: "Disponível para o uso", qualificacao: "OK", validacoes_finais: ["VPN", "M365"],
  recebido_laboratorio: false, recebido_estoque: false, analista_logistica: "", data_hora_logistica: "",
};

describe("gerarRatPdf", () => {
  it("gera um A4 de uma página com campos completos e texto longo", async () => {
    const bytes = await gerarRatPdf(vazia);
    const pdf = await PDFDocument.load(bytes);
    expect(bytes.length).toBeGreaterThan(5_000);
    expect(pdf.getPageCount()).toBe(1);
    expect(pdf.getPage(0).getWidth()).toBeCloseTo(595.304, 2);
    expect(pdf.getPage(0).getHeight()).toBeCloseTo(841.89, 2);
    expect(pdf.catalog.get(PDFName.of("AcroForm"))).toBeUndefined();
    expect(pdf.getPage(0).node.get(PDFName.of("Annots"))).toBeUndefined();
  });

  it("gera com campos vazios sem criar segunda página", async () => {
    const bytes = await gerarRatPdf({ ...vazia, chamado: "", descricao: "", tipos_ocorrencia: [], validacoes_finais: [] });
    expect((await PDFDocument.load(bytes)).getPageCount()).toBe(1);
  });

  it("incorpora assinaturas PNG de cliente e técnico", async () => {
    const png = Uint8Array.from(Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9ZQmcAAAAASUVORK5CYII=", "base64"));
    const semAssinaturas = await gerarRatPdf(vazia);
    const comAssinaturas = await gerarRatPdf(vazia, {
      cliente: { nome: "Cliente", documento: "", assinado_em: "31/07/2026 10:00", bytes: png },
      tecnico: { nome: "Técnico", assinado_em: "31/07/2026 10:00", bytes: png },
    });
    expect(comAssinaturas.length).toBeGreaterThan(semAssinaturas.length);
  });
});
