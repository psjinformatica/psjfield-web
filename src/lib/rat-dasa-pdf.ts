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
import { calcularLayoutTextoPdf } from "@/lib/pdf-text-layout";

export const CAMINHO_TEMPLATE_RAT_DASA = path.join(process.cwd(), "Documentacao", "Modelos", "RAT_DASA_Modelo.pdf");

type Caixa = { x: number; topo: number; largura: number; altura: number };
type PosicoesData = { dia: number; mes: number; ano: number };
type PosicoesHora = { hora: number; minuto: number };
type OpcoesTexto = {
  tamanhoMaximo?: number;
  tamanhoMinimo?: number;
  entrelinha?: number;
  maximoLinhas?: number;
  fatorLarguraPreferida?: number;
};

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
  assinatura_cliente_texto: { x: 323, topo: 665, largura: 222, altura: 16 },
  tecnico_nome: { x: 78, topo: 752, largura: 198, altura: 17 },
  assinatura_tecnico_texto: { x: 323, topo: 752, largura: 222, altura: 17 },
  inicio_data: { x: 72, topo: 789.5, largura: 75, altura: 18 },
  inicio_hora: { x: 166, topo: 789.5, largura: 73, altura: 18 },
  termino_data: { x: 374, topo: 789.5, largura: 75, altura: 18 },
  termino_hora: { x: 470, topo: 789.5, largura: 73, altura: 18 },
} satisfies Record<string, Caixa>;

export const POSICOES_COMPONENTES_DATA_HORA_RAT_DASA = {
  inicio_data: { dia: 72, mes: 90, ano: 117 },
  inicio_hora: { hora: 176, minuto: 194 },
  termino_data: { dia: 378, mes: 397, ano: 424 },
  termino_hora: { hora: 481, minuto: 504 },
} as const;

export const DESLOCAMENTO_VERTICAL_COMPONENTES_DATA_HORA_RAT_DASA = 3;

export const POSICOES_MARCACOES_RAT_DASA = {
  atendimento: {
    FIELD_SERVICES: [59.4, 164.4, 9.8, 9.8], REMOTE_HANDS: [59.4, 176.9, 9.8, 9.8],
    RDM: [131.4, 164.9, 9.8, 10.1], PROJETO: [131.4, 177.4, 9.8, 9.8],
  },
  equipamento: {
    Desktop: [239.6, 164.4, 8.4, 8.2], Monitor: [286.6, 164.6, 8.4, 8.2],
    Etiquetadora: [337.2, 164.6, 8.4, 8.2], SRX: [400.3, 164.6, 8.4, 8.2],
    Outro: [442.3, 164.6, 8.4, 8.2], Notebook: [239.6, 177.6, 8.4, 8.4],
    Impressora: [287.3, 177.6, 8.4, 8.4], "Ponto de Rede": [337.2, 177.6, 8.4, 8.4],
    Servidor: [401, 176.6, 8.4, 8.4],
  },
  checklist_aplicado: {
    energia: [64, 326.3, 8.4, 8.4], rede_rj45: [206.7, 326.3, 8.4, 8.4],
    limpeza_temporarios: [313.7, 326.3, 8.4, 8.4], problema_reincidente: [436.5, 326.3, 8.2, 8.4],
    cabo_video: [64, 339.2, 8.4, 8.4], system_center: [206.7, 339.2, 8.4, 8.4],
    ativacao_windows_office: [313.7, 339.2, 8.4, 8.4], demais_perifericos: [64, 352.2, 8.4, 8.4],
    antivirus: [206.7, 352.2, 8.4, 8.4], hostname_correto: [313.7, 352.2, 8.4, 8.4],
  },
  checklist_formatacao_antes: {
    print_impressoras_instaladas: [101.9, 378.3, 8.4, 8.4], print_programas_instalados: [101.9, 388.9, 8.4, 8.4],
    print_pastas_email_copia_psts: [101.9, 399.5, 8.4, 8.4], print_area_trabalho: [102.1, 409.3, 8.4, 8.4],
    copia_perfil_usuario: [102.1, 419.9, 8.4, 8.4],
  },
  checklist_formatacao_depois: {
    impressoras_instaladas_testadas: [321.6, 378.3, 8.4, 8.4], programas_instalados_testados: [321.4, 388.4, 8.4, 8.4],
    pastas_email_psts_restauradas_email_ok: [321.4, 398.5, 8.4, 8.4], area_trabalho_restaurada: [321.6, 408.1, 8.4, 8.4],
    perfil_usuario_restaurado: [321.6, 417.9, 8.4, 8.4], testes_usuario_validados: [321.4, 427.8, 8.4, 7.2],
  },
  respostas: {
    problema_solucionado: [64, 523.6, 8.4, 8.2], garantia_acionada: [159.4, 523.6, 8.2, 8.2],
    retirado_laboratorio: [238.9, 523.6, 8.4, 8.2], retirada_estoque_ti: [338.9, 523.6, 8.4, 8.2],
    visita_improdutiva: [445.8, 523.6, 8.4, 8.2], laudado: [100.9, 562, 8.4, 8.4],
  },
  motivo_laudo: {
    COM_DEFEITO: [215.3, 562.5, 8.4, 8.4], MAU_USO: [269.8, 562.5, 8.4, 8.4],
    OBSOLETO: [313.2, 562.5, 8.4, 8.4], DESCARTE: [355.7, 562.5, 8.4, 8.4],
  },
  avaliacao: {
    BOM: [284.9, 698.1, 8.4, 8.4], REGULAR: [328.1, 698.8, 8.4, 8.4], RUIM: [379.7, 698.8, 8.4, 8.4],
  },
} as const;

export function calcularLayoutTextoRatDasa(
  font: PDFFont,
  valor: string,
  caixa: Pick<Caixa, "largura" | "altura">,
  opcoes: OpcoesTexto = {},
) {
  return calcularLayoutTextoPdf(font, valor, caixa, {
    tamanhoInicial: opcoes.tamanhoMaximo ?? 8,
    tamanhoMinimo: opcoes.tamanhoMinimo ?? 5.5,
    entrelinha: opcoes.entrelinha,
    maximoLinhas: opcoes.maximoLinhas ?? Number.MAX_SAFE_INTEGER,
    fatorLarguraPreferida: opcoes.fatorLarguraPreferida,
  });
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

export type PosicaoMarcacaoRatDasa = readonly [number, number, number, number];

export function desenharMarcacaoRatDasa(page: PDFPage, posicao?: PosicaoMarcacaoRatDasa) {
  if (!posicao) return;
  const [x, topo, largura, altura] = posicao;
  const margem = Math.min(largura, altura) * 0.23;
  const y = page.getHeight() - topo - altura;
  page.drawLine({
    start: { x: x + margem, y: y + margem },
    end: { x: x + largura - margem, y: y + altura - margem },
    thickness: 0.9,
    color: rgb(0, 0, 0),
  });
  page.drawLine({
    start: { x: x + margem, y: y + altura - margem },
    end: { x: x + largura - margem, y: y + margem },
    thickness: 0.9,
    color: rgb(0, 0, 0),
  });
}

function adicionarSelecionados<T extends Record<string, boolean>>(
  destino: PosicaoMarcacaoRatDasa[],
  valores: T,
  posicoes: Partial<Record<keyof T, PosicaoMarcacaoRatDasa>>,
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

export function desenharAssinaturaOuNomeRatDasa(
  page: PDFPage,
  font: PDFFont,
  imagem: PDFImage | null,
  nome: string,
  caixaImagem: Caixa,
  caixaTexto: Caixa,
) {
  if (imagem) {
    desenharAssinatura(page, imagem, caixaImagem);
    return "imagem" as const;
  }
  desenharTexto(page, font, "identificação no campo de assinatura", nome, caixaTexto, {
    tamanhoMaximo: 9,
    tamanhoMinimo: 6,
    maximoLinhas: 1,
  });
  return "texto" as const;
}

export function formatarDataRatDasaPdf(valor: string) {
  const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(valor);
  return partes ? `${partes[3]}/${partes[2]}/${partes[1].slice(-2)}` : valor;
}

export function decomporDataRatDasaPdf(valor: string) {
  const partes = /^(\d{2})\/(\d{2})\/(\d{2})$/.exec(valor);
  if (!partes) throw new Error("Data inválida para renderização no PDF DASA.");
  return { dia: partes[1], mes: partes[2], ano: partes[3] };
}

export function decomporHoraRatDasaPdf(valor: string) {
  const partes = /^(\d{2}):(\d{2})$/.exec(valor);
  if (!partes) throw new Error("Hora inválida para renderização no PDF DASA.");
  return { hora: partes[1], minuto: partes[2] };
}

export function componentesDataRatDasaPdf(valor: string, posicoes: PosicoesData) {
  const partes = decomporDataRatDasaPdf(valor);
  return [
    { valor: partes.dia, x: posicoes.dia },
    { valor: partes.mes, x: posicoes.mes },
    { valor: partes.ano, x: posicoes.ano },
  ];
}

export function componentesHoraRatDasaPdf(valor: string, posicoes: PosicoesHora) {
  const partes = decomporHoraRatDasaPdf(valor);
  return [
    { valor: partes.hora, x: posicoes.hora },
    { valor: partes.minuto, x: posicoes.minuto },
  ];
}

function desenharComponentesDataHora(
  page: PDFPage,
  font: PDFFont,
  campo: string,
  componentes: Array<{ valor: string; x: number }>,
  caixa: Caixa,
) {
  componentes.forEach(({ valor, x }) => desenharTexto(
    page,
    font,
    campo,
    valor,
    {
      ...caixa,
      x,
      topo: caixa.topo + DESLOCAMENTO_VERTICAL_COMPONENTES_DATA_HORA_RAT_DASA,
      largura: 14,
    },
    { tamanhoMaximo: 9, tamanhoMinimo: 9, maximoLinhas: 1 },
  ));
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
  desenharTexto(page, font, "defeito informado", dados.atendimento.defeito_informado, caixas.defeito_informado, { tamanhoMaximo: 9, tamanhoMinimo: 5.5, maximoLinhas: 3, fatorLarguraPreferida: 0.9 });
  desenharTexto(page, font, "defeito constatado", dados.atendimento.defeito_constatado, caixas.defeito_constatado, { tamanhoMaximo: 9, tamanhoMinimo: 5.5, maximoLinhas: 3, fatorLarguraPreferida: 0.9 });
  desenharTexto(page, font, "observações do defeito", dados.atendimento.observacoes_defeito, caixas.observacoes_defeito, { tamanhoMaximo: 7, maximoLinhas: 1 });
  desenharTexto(page, font, "solução aplicada", dados.atendimento.solucao_aplicada, caixas.solucao_aplicada, { tamanhoMaximo: 9, tamanhoMinimo: 5.5, maximoLinhas: 4, fatorLarguraPreferida: 0.78 });
  desenharTexto(page, font, "observações da solução", dados.atendimento.observacoes_solucao, caixas.observacoes_solucao, { tamanhoMaximo: 7, maximoLinhas: 1 });
  desenharTexto(page, font, "encaminhamento", dados.atendimento.encaminhado_para, caixas.encaminhado_para, { tamanhoMaximo: 7 });
  desenharTexto(page, font, "centro de custo", dados.laudo.centro_custo, caixas.centro_custo, { tamanhoMaximo: 7 });
  desenharTexto(page, font, "nome do colaborador acompanhante", dados.cliente.nome_colaborador_acompanhante, caixas.colaborador_acompanhante, { tamanhoMaximo: 10, tamanhoMinimo: 6 });
  desenharTexto(page, font, "nome do técnico", dados.tecnico.nome_tecnico, caixas.tecnico_nome, { tamanhoMaximo: 10, tamanhoMinimo: 6 });
  desenharComponentesDataHora(page, font, "data de início", componentesDataRatDasaPdf(
    formatarDataRatDasaPdf(dados.tecnico.inicio_data),
    POSICOES_COMPONENTES_DATA_HORA_RAT_DASA.inicio_data,
  ), caixas.inicio_data);
  desenharComponentesDataHora(page, font, "hora de início", componentesHoraRatDasaPdf(
    dados.tecnico.inicio_hora,
    POSICOES_COMPONENTES_DATA_HORA_RAT_DASA.inicio_hora,
  ), caixas.inicio_hora);
  desenharComponentesDataHora(page, font, "data de término", componentesDataRatDasaPdf(
    formatarDataRatDasaPdf(dados.tecnico.termino_data),
    POSICOES_COMPONENTES_DATA_HORA_RAT_DASA.termino_data,
  ), caixas.termino_data);
  desenharComponentesDataHora(page, font, "hora de término", componentesHoraRatDasaPdf(
    dados.tecnico.termino_hora,
    POSICOES_COMPONENTES_DATA_HORA_RAT_DASA.termino_hora,
  ), caixas.termino_hora);
  if (dados.equipamento.tipo === "Outro") {
    desenharTexto(page, font, "outro tipo de equipamento", dados.equipamento.tipo_outro, { x: 480, topo: 165, largura: 88, altura: 13 }, { tamanhoMaximo: 6.5, tamanhoMinimo: 5 });
  }
}

function adicionarOpcao<T extends string>(
  destino: PosicaoMarcacaoRatDasa[],
  valor: T | "",
  posicoes: Partial<Record<T, PosicaoMarcacaoRatDasa>>,
) {
  const posicao = valor ? posicoes[valor] : undefined;
  if (posicao) destino.push(posicao);
}

export function listarMarcacoesRatDasa(dados: RatDasaSnapshotV1) {
  const marcacoes: PosicaoMarcacaoRatDasa[] = [];
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
    const [x, topo, largura, altura] = POSICOES_MARCACOES_RAT_DASA.respostas.visita_improdutiva;
    page.drawRectangle({
      x,
      y: page.getHeight() - topo - altura,
      width: largura,
      height: altura,
      borderWidth: 0.5,
      borderColor: rgb(0, 0, 0),
    });
  }
  listarMarcacoesRatDasa(dados).forEach((posicao) => desenharMarcacaoRatDasa(page, posicao));
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
  desenharAssinaturaOuNomeRatDasa(
    page,
    font,
    assinaturaCliente,
    dados.cliente.nome_colaborador_acompanhante,
    { x: 323, topo: 660, largura: 222, altura: 23 },
    caixas.assinatura_cliente_texto,
  );
  desenharAssinaturaOuNomeRatDasa(
    page,
    font,
    assinaturaTecnico,
    dados.tecnico.nome_tecnico,
    { x: 323, topo: 748, largura: 222, altura: 22 },
    caixas.assinatura_tecnico_texto,
  );

  pdf.setTitle(`RAT DASA ${dados.equipamento.chamado_moebius}`);
  pdf.setSubject("Ordem de Serviço DASA - Field Service");
  pdf.setCreator("PSJField");
  return new Uint8Array(await pdf.save({ useObjectStreams: false }));
}
