import { readFile } from "node:fs/promises";
import path from "node:path";

import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFImage,
  type PDFPage,
  type PDFFont,
} from "pdf-lib";

import type {
  AvaliacaoDasa,
  MotivoLaudoDasa,
  RatDasaSnapshotV1,
  TipoAtendimentoDasa,
  TipoEquipamentoDasa,
} from "@/lib/rat-dasa-types";
import { validarRatDasaV1ParaGeracao } from "@/lib/rat-dasa-validation";

export const CAMINHO_TEMPLATE_RAT_DASA = path.join(process.cwd(), "Documentacao", "Modelos", "RAT_DASA_Modelo.pdf");

type Caixa = { x: number; topo: number; largura: number; altura: number };
type OpcoesTexto = { tamanhoMaximo?: number; tamanhoMinimo?: number; entrelinha?: number };

export type AssinaturasPdfDasa = {
  cliente?: Uint8Array;
  tecnico?: Uint8Array;
};

export class RatDasaPdfOverflowError extends Error {
  constructor(public readonly campo: string) {
    super(`O campo ${campo} excede a área disponível no PDF DASA.`);
    this.name = "RatDasaPdfOverflowError";
  }
}

const caixas = {
  unidade_nome: { x: 61, topo: 77, largura: 139, altura: 12 },
  marca_unidade: { x: 203, topo: 77, largura: 109, altura: 12 },
  solicitante: { x: 315, topo: 77, largura: 163, altura: 12 },
  setor: { x: 480, topo: 77, largura: 90, altura: 12 },
  endereco: { x: 61, topo: 100, largura: 251, altura: 13 },
  cidade: { x: 315, topo: 100, largura: 108, altura: 13 },
  estado: { x: 426, topo: 100, largura: 52, altura: 13 },
  telefone: { x: 481, topo: 100, largura: 89, altura: 13 },
  chamado_moebius: { x: 61, topo: 139, largura: 105, altura: 14 },
  chamado_ca: { x: 168, topo: 139, largura: 81, altura: 14 },
  patrimonio: { x: 251, topo: 139, largura: 75, altura: 14 },
  service_tag_serial: { x: 328, topo: 139, largura: 100, altura: 14 },
  marca_equipamento: { x: 431, topo: 139, largura: 63, altura: 14 },
  modelo_equipamento: { x: 497, topo: 139, largura: 73, altura: 14 },
  defeito_informado: { x: 61, topo: 202, largura: 509, altura: 37 },
  defeito_constatado: { x: 61, topo: 251, largura: 509, altura: 38 },
  observacoes_defeito: { x: 80, topo: 291, largura: 490, altura: 20 },
  solucao_aplicada: { x: 61, topo: 450, largura: 509, altura: 50 },
  observacoes_solucao: { x: 80, topo: 502, largura: 490, altura: 20 },
  encaminhado_para: { x: 151, topo: 536, largura: 135, altura: 12 },
  centro_custo: { x: 494, topo: 562, largura: 76, altura: 13 },
  colaborador_acompanhante: { x: 78, topo: 665, largura: 198, altura: 16 },
  tecnico_nome: { x: 78, topo: 752, largura: 198, altura: 17 },
  inicio_data: { x: 72, topo: 794, largura: 75, altura: 18 },
  inicio_hora: { x: 166, topo: 794, largura: 73, altura: 18 },
  termino_data: { x: 374, topo: 794, largura: 75, altura: 18 },
  termino_hora: { x: 470, topo: 794, largura: 73, altura: 18 },
} satisfies Record<string, Caixa>;

export const POSICOES_MARCACOES_RAT_DASA = {
  atendimento: {
    FIELD_SERVICES: [63, 165], REMOTE_HANDS: [63, 178], RDM: [140, 165], PROJETO: [140, 178],
  },
  equipamento: {
    Desktop: [242, 165], Monitor: [294, 165], Etiquetadora: [352, 165], SRX: [425, 165], Outro: [470, 165],
    Notebook: [242, 178], Impressora: [294, 178], "Ponto de Rede": [352, 178], Servidor: [425, 178],
  },
  checklist_aplicado: {
    energia: [64, 327], rede_rj45: [208, 327], limpeza_temporarios: [315, 327], problema_reincidente: [438, 327],
    cabo_video: [64, 340], system_center: [208, 340], ativacao_windows_office: [315, 340],
    demais_perifericos: [64, 353], antivirus: [208, 353], hostname_correto: [315, 353],
  },
  checklist_formatacao_antes: {
    print_impressoras_instaladas: [104, 376], print_programas_instalados: [104, 387],
    print_pastas_email_copia_psts: [104, 397], print_area_trabalho: [104, 407], copia_perfil_usuario: [104, 417],
  },
  checklist_formatacao_depois: {
    impressoras_instaladas_testadas: [323, 376], programas_instalados_testados: [323, 386],
    pastas_email_psts_restauradas_email_ok: [323, 396], area_trabalho_restaurada: [323, 406],
    perfil_usuario_restaurado: [323, 416], testes_usuario_validados: [323, 426],
  },
  respostas: {
    problema_solucionado: [64, 524], garantia_acionada: [161, 524], retirado_laboratorio: [240, 524],
    retirada_estoque_ti: [340, 524], visita_improdutiva: [446, 524], laudado: [101, 562],
  },
  motivo_laudo: {
    COM_DEFEITO: [217, 562], MAU_USO: [270, 562], OBSOLETO: [313, 562], DESCARTE: [356, 562],
  },
  avaliacao: { BOM: [285, 699], REGULAR: [328, 699], RUIM: [380, 699] },
} as const;

function quebrarPalavra(font: PDFFont, palavra: string, tamanho: number, largura: number) {
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

function quebrarTexto(font: PDFFont, valor: string, tamanho: number, largura: number) {
  const linhas: string[] = [];
  for (const paragrafo of valor.replace(/\r\n?/g, "\n").split("\n")) {
    if (!paragrafo.trim()) {
      linhas.push("");
      continue;
    }
    let atual = "";
    for (const palavraOriginal of paragrafo.trim().split(/\s+/)) {
      const palavras = font.widthOfTextAtSize(palavraOriginal, tamanho) > largura
        ? quebrarPalavra(font, palavraOriginal, tamanho, largura)
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

export function calcularLayoutTextoRatDasa(
  font: PDFFont,
  valor: string,
  caixa: Pick<Caixa, "largura" | "altura">,
  opcoes: OpcoesTexto = {},
) {
  const maximo = opcoes.tamanhoMaximo ?? 8;
  const minimo = opcoes.tamanhoMinimo ?? 5.5;
  const entrelinha = opcoes.entrelinha ?? 1.18;
  for (let tamanho = maximo; tamanho >= minimo; tamanho -= 0.5) {
    const linhas = quebrarTexto(font, valor, tamanho, caixa.largura);
    if (linhas.length * tamanho * entrelinha <= caixa.altura) return { linhas, tamanho, entrelinha };
  }
  return null;
}

function desenharTexto(
  page: PDFPage,
  font: PDFFont,
  campo: string,
  valor: string,
  caixa: Caixa,
  opcoes?: OpcoesTexto,
) {
  if (!valor) return;
  const layout = calcularLayoutTextoRatDasa(font, valor, caixa, opcoes);
  if (!layout) throw new RatDasaPdfOverflowError(campo);
  layout.linhas.forEach((linha, indice) => {
    const y = page.getHeight() - caixa.topo - layout.tamanho - indice * layout.tamanho * layout.entrelinha;
    page.drawText(linha, { x: caixa.x, y, size: layout.tamanho, font, color: rgb(0.03, 0.03, 0.03) });
  });
}

function marcar(page: PDFPage, posicao?: readonly [number, number]) {
  if (!posicao) return;
  const [x, topo] = posicao;
  const tamanhoQuadrado = 8;
  const margem = 1.75;
  const y = page.getHeight() - topo - tamanhoQuadrado;
  page.drawLine({
    start: { x: x + margem, y: y + margem },
    end: { x: x + tamanhoQuadrado - margem, y: y + tamanhoQuadrado - margem },
    thickness: 0.9,
    color: rgb(0, 0, 0),
  });
  page.drawLine({
    start: { x: x + margem, y: y + tamanhoQuadrado - margem },
    end: { x: x + tamanhoQuadrado - margem, y: y + margem },
    thickness: 0.9,
    color: rgb(0, 0, 0),
  });
}

function adicionarSelecionados<T extends Record<string, boolean>>(
  destino: Array<readonly [number, number]>,
  valores: T,
  posicoes: Partial<Record<keyof T, readonly [number, number]>>,
) {
  Object.entries(valores).forEach(([chave, ativo]) => {
    const posicao = posicoes[chave as keyof T];
    if (ativo === true && posicao) destino.push(posicao);
  });
}

async function incorporarAssinatura(pdf: PDFDocument, bytes: Uint8Array | undefined, campo: string) {
  if (!bytes?.length) return null;
  try {
    return await pdf.embedPng(bytes);
  } catch {
    try {
      return await pdf.embedJpg(bytes);
    } catch {
      throw new Error(`A ${campo} não é uma imagem PNG ou JPEG válida.`);
    }
  }
}

function desenharAssinatura(page: PDFPage, imagem: PDFImage | null, caixa: Caixa) {
  if (!imagem) return;
  const escala = Math.min(caixa.largura / imagem.width, caixa.altura / imagem.height);
  const largura = imagem.width * escala;
  const altura = imagem.height * escala;
  page.drawImage(imagem, {
    x: caixa.x + (caixa.largura - largura) / 2,
    y: page.getHeight() - caixa.topo - caixa.altura + (caixa.altura - altura) / 2,
    width: largura,
    height: altura,
  });
}

export function formatarDataRatDasaPdf(valor: string) {
  const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(valor);
  return partes ? `${partes[3]}/${partes[2]}/${partes[1].slice(-2)}` : valor;
}

function preencherTextos(page: PDFPage, font: PDFFont, dados: RatDasaSnapshotV1) {
  desenharTexto(page, font, "unidade/nome", dados.local.unidade_nome, caixas.unidade_nome);
  desenharTexto(page, font, "marca da unidade", dados.local.marca, caixas.marca_unidade);
  desenharTexto(page, font, "solicitante", dados.local.solicitante, caixas.solicitante);
  desenharTexto(page, font, "setor", dados.local.setor, caixas.setor);
  desenharTexto(page, font, "endereço", dados.local.endereco, caixas.endereco);
  desenharTexto(page, font, "cidade", dados.local.cidade, caixas.cidade);
  desenharTexto(page, font, "estado", dados.local.estado, caixas.estado);
  desenharTexto(page, font, "telefone", dados.local.telefone, caixas.telefone);
  desenharTexto(page, font, "chamado Moebius", dados.equipamento.chamado_moebius, caixas.chamado_moebius);
  desenharTexto(page, font, "chamado CA", dados.equipamento.chamado_ca, caixas.chamado_ca);
  desenharTexto(page, font, "patrimônio", dados.equipamento.patrimonio, caixas.patrimonio);
  desenharTexto(page, font, "service tag/serial", dados.equipamento.service_tag_serial, caixas.service_tag_serial);
  desenharTexto(page, font, "marca do equipamento", dados.equipamento.marca, caixas.marca_equipamento);
  desenharTexto(page, font, "modelo", dados.equipamento.modelo, caixas.modelo_equipamento);
  desenharTexto(page, font, "defeito informado", dados.atendimento.defeito_informado, caixas.defeito_informado, { tamanhoMaximo: 9, tamanhoMinimo: 5.5 });
  desenharTexto(page, font, "defeito constatado", dados.atendimento.defeito_constatado, caixas.defeito_constatado, { tamanhoMaximo: 9, tamanhoMinimo: 5.5 });
  desenharTexto(page, font, "observações do defeito", dados.atendimento.observacoes_defeito, caixas.observacoes_defeito, { tamanhoMaximo: 7 });
  desenharTexto(page, font, "solução aplicada", dados.atendimento.solucao_aplicada, caixas.solucao_aplicada, { tamanhoMaximo: 9, tamanhoMinimo: 5.5 });
  desenharTexto(page, font, "observações da solução", dados.atendimento.observacoes_solucao, caixas.observacoes_solucao, { tamanhoMaximo: 7 });
  desenharTexto(page, font, "encaminhamento", dados.atendimento.encaminhado_para, caixas.encaminhado_para, { tamanhoMaximo: 7 });
  desenharTexto(page, font, "centro de custo", dados.laudo.centro_custo, caixas.centro_custo, { tamanhoMaximo: 7 });
  desenharTexto(page, font, "nome do colaborador acompanhante", dados.cliente.nome_colaborador_acompanhante, caixas.colaborador_acompanhante, { tamanhoMaximo: 10, tamanhoMinimo: 6 });
  desenharTexto(page, font, "nome do técnico", dados.tecnico.nome_tecnico, caixas.tecnico_nome, { tamanhoMaximo: 10, tamanhoMinimo: 6 });
  desenharTexto(page, font, "data de início", formatarDataRatDasaPdf(dados.tecnico.inicio_data), caixas.inicio_data, { tamanhoMaximo: 9 });
  desenharTexto(page, font, "hora de início", dados.tecnico.inicio_hora, caixas.inicio_hora, { tamanhoMaximo: 9 });
  desenharTexto(page, font, "data de término", formatarDataRatDasaPdf(dados.tecnico.termino_data), caixas.termino_data, { tamanhoMaximo: 9 });
  desenharTexto(page, font, "hora de término", dados.tecnico.termino_hora, caixas.termino_hora, { tamanhoMaximo: 9 });
  if (dados.equipamento.tipo === "Outro") {
    desenharTexto(page, font, "outro tipo de equipamento", dados.equipamento.tipo_outro, { x: 480, topo: 165, largura: 88, altura: 13 }, { tamanhoMaximo: 6.5, tamanhoMinimo: 5 });
  }
}

function adicionarOpcao<T extends string>(
  destino: Array<readonly [number, number]>,
  valor: T | "",
  posicoes: Partial<Record<T, readonly [number, number]>>,
) {
  const posicao = valor ? posicoes[valor] : undefined;
  if (posicao) destino.push(posicao);
}

export function listarMarcacoesRatDasa(dados: RatDasaSnapshotV1) {
  const marcacoes: Array<readonly [number, number]> = [];
  adicionarOpcao<TipoAtendimentoDasa>(marcacoes, dados.atendimento.tipo, POSICOES_MARCACOES_RAT_DASA.atendimento);
  adicionarOpcao<TipoEquipamentoDasa>(marcacoes, dados.equipamento.tipo, POSICOES_MARCACOES_RAT_DASA.equipamento);
  adicionarSelecionados(marcacoes, dados.atendimento.checklist_aplicado, POSICOES_MARCACOES_RAT_DASA.checklist_aplicado);
  adicionarSelecionados(marcacoes, dados.atendimento.checklist_formatacao.antes, POSICOES_MARCACOES_RAT_DASA.checklist_formatacao_antes);
  adicionarSelecionados(marcacoes, dados.atendimento.checklist_formatacao.depois, POSICOES_MARCACOES_RAT_DASA.checklist_formatacao_depois);
  if (dados.atendimento.problema_solucionado === true) marcacoes.push(POSICOES_MARCACOES_RAT_DASA.respostas.problema_solucionado);
  if (dados.atendimento.garantia_acionada === true) marcacoes.push(POSICOES_MARCACOES_RAT_DASA.respostas.garantia_acionada);
  if (dados.atendimento.retirado_laboratorio === true) marcacoes.push(POSICOES_MARCACOES_RAT_DASA.respostas.retirado_laboratorio);
  if (dados.atendimento.retirada_estoque_ti === true) marcacoes.push(POSICOES_MARCACOES_RAT_DASA.respostas.retirada_estoque_ti);
  if (dados.atendimento.visita_improdutiva === true) marcacoes.push(POSICOES_MARCACOES_RAT_DASA.respostas.visita_improdutiva);
  if (dados.laudo.laudado === true) marcacoes.push(POSICOES_MARCACOES_RAT_DASA.respostas.laudado);
  adicionarOpcao<MotivoLaudoDasa>(marcacoes, dados.laudo.motivo, POSICOES_MARCACOES_RAT_DASA.motivo_laudo);
  adicionarOpcao<AvaliacaoDasa>(marcacoes, dados.cliente.avaliacao, POSICOES_MARCACOES_RAT_DASA.avaliacao);
  return marcacoes;
}

function preencherMarcacoes(page: PDFPage, dados: RatDasaSnapshotV1) {
  if (dados.atendimento.visita_improdutiva === true) {
    const [x, topo] = POSICOES_MARCACOES_RAT_DASA.respostas.visita_improdutiva;
    page.drawRectangle({
      x,
      y: page.getHeight() - topo - 8,
      width: 8,
      height: 8,
      borderWidth: 0.5,
      borderColor: rgb(0, 0, 0),
    });
  }
  listarMarcacoesRatDasa(dados).forEach((posicao) => marcar(page, posicao));
}

export async function gerarRatDasaPdf(entrada: unknown, assinaturas: AssinaturasPdfDasa = {}) {
  const dados = validarRatDasaV1ParaGeracao(entrada);
  const pdf = await PDFDocument.load(await readFile(CAMINHO_TEMPLATE_RAT_DASA));
  if (pdf.getPageCount() !== 1) throw new Error("O template da RAT DASA deve possuir exatamente uma página.");
  const page = pdf.getPage(0);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  preencherTextos(page, font, dados);
  preencherMarcacoes(page, dados);

  const [assinaturaCliente, assinaturaTecnico] = await Promise.all([
    incorporarAssinatura(pdf, assinaturas.cliente, "assinatura do colaborador"),
    incorporarAssinatura(pdf, assinaturas.tecnico, "assinatura do técnico"),
  ]);
  desenharAssinatura(page, assinaturaCliente, { x: 323, topo: 660, largura: 222, altura: 23 });
  desenharAssinatura(page, assinaturaTecnico, { x: 323, topo: 748, largura: 222, altura: 22 });

  pdf.setTitle(`RAT DASA ${dados.equipamento.chamado_moebius}`);
  pdf.setSubject("Ordem de Serviço DASA - Field Service");
  pdf.setCreator("PSJField");
  return new Uint8Array(await pdf.save({ useObjectStreams: false }));
}
