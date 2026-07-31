import { readFile } from "node:fs/promises";
import path from "node:path";

import { PDFDocument, PDFName, StandardFonts, rgb, type PDFForm, type PDFImage, type PDFPage, type PDFFont } from "pdf-lib";

import type { RatAssinaturas, RatRevisao } from "@/lib/rat-types";

const TEMPLATE = path.join(process.cwd(), "Documentacao", "Modelos", "RAT_Claro_Modelo.pdf");
const CHECK = "Caixa de sele#C3#A7#C3#A3o 1";
const TEXT = "Caixa de texto 1";
const RADIO = "Bot#C3#A3o de op#C3#A7#C3#A3o 1";

const ocorrencias = ["Instalação", "Substituição", "Devolução", "Formatação", "Empréstimo", "Manutenção", "Laudo"];
const equipamentos = ["Notebook", "Desktop", "Monitor", "Outro"];
const statusEquipamento = ["Equipamento OK", "Desgaste Natural", "Fora de Garantia"];

function nome(base: string, indice: number) {
  return indice === 1 ? base : `${base}_${indice}`;
}

function dataPdf(valor: string) {
  const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(valor);
  return partes ? `${partes[3]}/${partes[2]}/${partes[1].slice(-2)}` : valor;
}

function dataHoraPdf(valor: string) {
  if (!valor) return "";
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return valor;
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" }).format(data).replace(",", " -");
}

function preencherTexto(form: PDFForm, indice: number, valor: string, tamanho = 7) {
  const campo = form.getTextField(nome(TEXT, indice));
  campo.setText(valor || "");
  campo.setFontSize(tamanho);
}

function marcar(form: PDFForm, indice: number, ativo: boolean) {
  const campo = form.getCheckBox(nome(CHECK, indice));
  if (ativo) campo.check(); else campo.uncheck();
}

function marcarGrupo(form: PDFForm, mapa: Record<string, number>, selecionados: string[]) {
  Object.entries(mapa).forEach(([opcao, indice]) => marcar(form, indice, selecionados.includes(opcao)));
}

async function imagemPng(pdf: PDFDocument, bytes?: Uint8Array) {
  if (!bytes?.length) return null;
  try { return await pdf.embedPng(bytes); } catch { return null; }
}

function desenharAssinatura(page: PDFPage, imagem: PDFImage | null, x: number, y: number, largura: number, altura: number) {
  if (!imagem) return;
  const escala = Math.min(largura / imagem.width, altura / imagem.height);
  page.drawImage(imagem, { x: x + (largura - imagem.width * escala) / 2, y, width: imagem.width * escala, height: imagem.height * escala });
}

function texto(page: PDFPage, font: PDFFont, valor: string, x: number, y: number, tamanho = 6.5, maximo = 42) {
  const exibido = valor.length > maximo ? `${valor.slice(0, maximo - 1)}…` : valor;
  if (exibido) page.drawText(exibido, { x, y, size: tamanho, font, color: rgb(0.05, 0.05, 0.05) });
}

function preencherCampos(form: PDFForm, dados: RatRevisao) {
  marcarGrupo(form, Object.fromEntries(ocorrencias.map((item, i) => [item, i + 8])), dados.tipos_ocorrencia);
  preencherTexto(form, 1, dados.chamado, 7);
  preencherTexto(form, 4, [dataPdf(dados.data_inicio), dados.hora_inicio].filter(Boolean).join(" "), 7);
  preencherTexto(form, 5, dados.login, 7);
  preencherTexto(form, 2, dados.colaborador, 7);
  preencherTexto(form, 6, dados.telefone, 7);
  preencherTexto(form, 3, dados.email, 7);
  preencherTexto(form, 7, dados.localidade, 6.2);
  marcarGrupo(form, Object.fromEntries(equipamentos.map((item, i) => [item, i + 15])), dados.tipo_equipamento ? [dados.tipo_equipamento] : []);
  preencherTexto(form, 8, dados.outro_equipamento, 7);
  const dominio = form.getDropdown("Caixa de lista 1");
  dominio.setFontSize(5.5);
  if (dados.dominio) { if (!dominio.getOptions().includes(dados.dominio)) dominio.addOptions([dados.dominio]); dominio.select(dados.dominio); } else dominio.clear();
  const atuais: [number, string][] = [[23, dados.atual_serial], [13, dados.atual_ae], [10, dados.atual_fabricante], [12, dados.atual_modelo], [9, dados.atual_processador], [14, dados.atual_hd], [11, dados.atual_hostname], [15, dados.atual_memoria]];
  const novos: [number, string][] = [[24, dados.novo_serial], [20, dados.novo_ae], [17, dados.novo_fabricante], [19, dados.novo_modelo], [16, dados.novo_processador], [21, dados.novo_hd], [18, dados.novo_hostname], [22, dados.novo_memoria]];
  [...atuais, ...novos].forEach(([indice, valor]) => preencherTexto(form, indice, valor, 6.2));
  preencherTexto(form, 25, dados.pasta_perfil_pst, 6.5);
  preencherTexto(form, 26, dados.software, 6.5);
  preencherTexto(form, 27, "", 6.5);
  marcar(form, 19, dados.recebido_laboratorio); marcar(form, 20, dados.recebido_estoque);
  const mapaItens = { "HD/SSD": 21, "Placa Mãe": 24, Touchpad: 27, "S.O.": 28, "Memória/Frequência": 30, Carcaça: 22, Teclado: 25, "App/Software": 26, "Tela/TV": 29, Outros: 23 };
  marcarGrupo(form, mapaItens, dados.itens_afetados);
  preencherTexto(form, 31, dados.memoria_frequencia, 6.5); preencherTexto(form, 30, dados.part_number, 6.5); preencherTexto(form, 29, dados.centro_custo, 6.5); preencherTexto(form, 28, dados.item_outros, 6.5);
  const mapaDiagnosticos = { Sobrecarga: 34, "Impacto ou Queda": 38, Configuração: 41, "Não Liga/Queimado": 35, "Intervenção não autorizada": 39, "Instalação de SW": 42, "Peça ou Componente Danificado": 36, "Contato com Líquido": 40, "Upgrade/Troca": 43, Outros: 37 };
  marcarGrupo(form, mapaDiagnosticos, dados.diagnosticos);
  preencherTexto(form, 32, dados.diagnostico_outros, 6.5);
  const descricao = form.getTextField(nome(TEXT, 33));
  descricao.enableMultiline();
  descricao.setText(dados.descricao.slice(0, 420));
  descricao.setFontSize(dados.descricao.length > 300 ? 4.5 : dados.descricao.length > 180 ? 5.2 : 6.2);
  marcarGrupo(form, Object.fromEntries(statusEquipamento.map((item, i) => [item, i + 31])), dados.status_equipamento);
  const condicao = form.getRadioGroup(RADIO); if (dados.condicao_equipamento === "Disponível para o uso") condicao.select("1"); else if (dados.condicao_equipamento === "Inoperante") condicao.select("2"); else condicao.clear();
  const qualificacao = form.getDropdown("Caixa de lista 1_2"); qualificacao.setFontSize(5.2); if (dados.qualificacao) { const valor = ` ${dados.qualificacao}`; if (!qualificacao.getOptions().includes(valor)) qualificacao.addOptions([valor]); qualificacao.select(valor); } else qualificacao.clear();
  const mapaValidacoes = { "Hostname Padronizado": 2, "SCCM/Central de Software": 5, "Configuração de Impressora": 7, VPN: 4, "Mapeamento de Rede": 1, "E-mail": 3, M365: 6 };
  marcarGrupo(form, mapaValidacoes, dados.validacoes_finais);
}

export async function gerarRatPdf(dados: RatRevisao, assinaturas: RatAssinaturas = {}) {
  const pdf = await PDFDocument.load(await readFile(TEMPLATE));
  const page = pdf.getPage(0);
  const form = pdf.getForm();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  preencherCampos(form, dados);
  preencherTexto(form, 27, assinaturas.tecnico?.nome || "", 6.2);
  form.updateFieldAppearances(font);
  form.flatten({ updateFieldAppearances: false });
  page.node.delete(PDFName.of("Annots"));
  pdf.catalog.delete(PDFName.of("AcroForm"));

  const cliente = await imagemPng(pdf, assinaturas.cliente?.bytes);
  const tecnico = await imagemPng(pdf, assinaturas.tecnico?.bytes);
  desenharAssinatura(page, cliente, 40, 422, 135, 23);
  desenharAssinatura(page, tecnico, 41, 383, 130, 20);
  desenharAssinatura(page, cliente, 88, 38, 170, 29);
  texto(page, font, assinaturas.cliente?.nome || dados.colaborador, 80, 33, 6.3, 35);
  texto(page, font, assinaturas.cliente?.documento || "", 195, 33, 5.2, 22);
  texto(page, font, dataHoraPdf(assinaturas.cliente?.assinado_em || ""), 218, 425, 6.2, 20);
  texto(page, font, dataHoraPdf(assinaturas.tecnico?.assinado_em || ""), 218, 375, 6.2, 20);
  texto(page, font, dados.analista_logistica, 330, 375, 6.2, 30);
  texto(page, font, dados.data_hora_logistica, 472, 375, 6.2, 20);
  texto(page, font, [dataPdf(dados.data_fim), dados.hora_fim].filter(Boolean).join(" - "), 390, 30, 7, 24);

  pdf.setTitle(`RAT ${dados.chamado || "sem chamado"}`);
  pdf.setSubject("OS - Ordem de Serviço - Field Service");
  pdf.setCreator("PSJField");
  return new Uint8Array(await pdf.save({ useObjectStreams: false }));
}
