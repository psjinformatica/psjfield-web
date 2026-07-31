import { createHash } from "node:crypto";
import PostalMime from "postal-mime";

import type { ChamadoImportacao, PreviaImportacao } from "@/lib/types";

const rotulos: Record<string, string[]> = {
  cliente: ["CLIENTE", "CLIENTE FINAL", "DOMINIO"],
  projeto: ["PROJETO", "CONTRATO"],
  numero_chamado: ["CHAMADO", "NUMERO DO CHAMADO"],
  data_agendada: ["DATA", "DATA DO ATENDIMENTO", "DATA AGENDADA"],
  hora_agendada: ["HORARIO", "HORA", "HORARIO DO ATENDIMENTO"],
  contato: ["CONTATO", "USUARIO", "RESPONSAVEL"],
  telefone: ["TELEFONE", "FONE", "CELULAR"],
  endereco: ["ENDERECO", "LOCAL DO ATENDIMENTO"],
  atividade: ["ATIVIDADE", "SERVICO", "ATIVIDADE A SER REALIZADA"],
  descricao: ["DESCRICAO", "DESCRICAO DO SERVICO"],
  equipamento: ["EQUIPAMENTO"],
  fabricante: ["FABRICANTE", "MARCA"],
  modelo: ["MODELO"],
  patrimonio_ae: ["PATRIMONIO", "ATIVO", "AE"],
  numero_serie: ["NUMERO DE SERIE", "SERIAL", "S/N"],
  valor_base: ["VALOR DO ATENDIMENTO POR 3 HORAS", "VALOR DO ATENDIMENTO", "VALOR"],
  horas_incluidas: ["HORAS INCLUIDAS", "HORAS"],
  valor_hora_adicional: ["HORA ADICIONAL", "VALOR HORA ADICIONAL"],
  observacoes: ["OBSERVACOES", "OBSERVACAO"],
};

const intermediadoras = new Set(["GRUPO EASY", "EASY", "EASYTECH", "GRUPO EASYTECH"]);
const tipos = ["NOTEBOOK", "DESKTOP", "IMPRESSORA", "MONITOR", "SERVIDOR", "REDE"];
const fabricantes = ["LENOVO", "DELL", "HP", "POSITIVO", "VAIO", "ACER", "ASUS", "SAMSUNG"];

export function semAcentos(valor: string) {
  return (valor || "").normalize("NFD").replace(/\p{Diacritic}/gu, "");
}

export function normalizarData(valor: string) {
  const iso = valor.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  if (iso) return iso[0];
  const br = valor.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{2,4})\b/);
  if (!br) return "";
  const ano = br[3].length === 2 ? `20${br[3]}` : br[3];
  const data = new Date(Date.UTC(Number(ano), Number(br[2]) - 1, Number(br[1])));
  if (
    data.getUTCFullYear() !== Number(ano) ||
    data.getUTCMonth() !== Number(br[2]) - 1 ||
    data.getUTCDate() !== Number(br[1])
  ) return "";
  return `${ano}-${br[2].padStart(2, "0")}-${br[1].padStart(2, "0")}`;
}

export function normalizarHora(valor: string) {
  const encontrado = valor.match(/\b([01]?\d|2[0-3])\s*[:hH]\s*(\d{2})?/);
  if (!encontrado) return "";
  return `${encontrado[1].padStart(2, "0")}:${encontrado[2] || "00"}`;
}

function numeroDecimal(valor = ""): string | null {
  let texto = valor.replace(/R\$\s*/gi, "").replace(/[^\d,.-]/g, "");
  if (!texto) return null;
  if (texto.includes(",")) texto = texto.replace(/\./g, "").replace(",", ".");
  const numero = Number(texto);
  return Number.isFinite(numero) ? String(numero) : null;
}

function textoDoHtml(html: string) {
  return html
    .replace(/<(br|\/p|\/div|\/li)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s+/g, "\n")
    .trim();
}

export function extrairCampos(texto: string) {
  const aliases = new Map<string, string>();
  for (const [campo, nomes] of Object.entries(rotulos)) {
    for (const nome of nomes) aliases.set(semAcentos(nome).toUpperCase(), campo);
  }
  const nomes = [...aliases.keys()]
    .sort((a, b) => b.length - a.length)
    .map((nome) => nome.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|");
  const padrao = new RegExp(`^\\s*(${nomes})\\s*[:;\\-]+\\s*(.*)$`, "i");
  const encontrados: Record<string, string> = {};
  for (const original of texto.replace(/\r\n?/g, "\n").split("\n")) {
    const linha = original.replace(/[\t\u00a0\u2000-\u200b ]+/g, " ").trim();
    const correspondencia = semAcentos(linha).match(padrao);
    if (!correspondencia) continue;
    const campo = aliases.get(correspondencia[1].toUpperCase());
    const inicioValor = linha.search(/[:;\-]+/);
    const valor = inicioValor >= 0 ? linha.slice(inicioValor).replace(/^[:;\-]+\s*/, "").trim() : "";
    if (campo && valor && !encontrados[campo]) encontrados[campo] = valor;
  }
  return encontrados;
}

function extrairCidadeEstado(endereco: string): [string, string] {
  const padroes = [
    /\b\d{2}\.?\d{3}-?\d{3}\s+([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ .'-]+?)\s+([A-Z]{2})\b/g,
    /\b([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ .'-]+?)\s*[-/]\s*([A-Z]{2})\b/g,
  ];
  for (const padrao of padroes) {
    const resultados = [...endereco.matchAll(padrao)];
    const ultimo = resultados.at(-1);
    if (ultimo) return [ultimo[1].trim().replace(/^-|-$/g, ""), ultimo[2].toUpperCase()];
  }
  return ["", ""];
}

function extrairEquipamento(valor: string, dados: Record<string, string>) {
  const normalizado = semAcentos(valor);
  const tipo = tipos.find((item) => new RegExp(`\\b${item}\\b`, "i").test(normalizado));
  const fabricante = fabricantes.find((item) => new RegExp(`\\b${item}\\b`, "i").test(normalizado));
  const serie = normalizado.match(/\b(?:SERIAL|S\/?N|NUMERO DE SERIE)\s*[:#]?\s*([A-Z0-9-]+)/i);
  const ae = normalizado.match(/\bAE\s*[:#]?\s*([A-Z0-9-]+)/i);
  let modelo = dados.modelo?.trim() || "";
  if (!modelo && fabricante) {
    const inicio = normalizado.toUpperCase().indexOf(fabricante) + fabricante.length;
    const resto = valor.slice(inicio).split(/\b(?:SERIAL|S\/?N|NUMERO DE SERIE|AE)\b/i)[0];
    modelo = resto.trim().replace(/^[: -]+|[: -]+$/g, "");
  }
  return {
    equipamento: tipo ? tipo[0] + tipo.slice(1).toLowerCase() : valor.trim(),
    fabricante: dados.fabricante?.trim() || (fabricante ? fabricante[0] + fabricante.slice(1).toLowerCase() : ""),
    modelo,
    numero_serie: dados.numero_serie?.trim() || serie?.[1] || "",
    patrimonio_ae: dados.patrimonio_ae?.trim() || ae?.[1] || "",
  };
}

export async function interpretarEml(
  conteudo: Uint8Array,
  nomeArquivo = "email.eml",
): Promise<PreviaImportacao> {
  if (!nomeArquivo.toLowerCase().endsWith(".eml")) throw new Error("Selecione um arquivo .eml.");
  if (!conteudo.byteLength) throw new Error("O arquivo .eml está vazio.");
  const email = await PostalMime.parse(conteudo);
  const assunto = email.subject || "";
  const remetente = email.from
    ? [email.from.name, email.from.address && `<${email.from.address}>`].filter(Boolean).join(" ")
    : "";
  const destinatario = (email.to || []).map((item) => item.address || item.name || "").filter(Boolean).join(", ");
  const corpo = email.text?.trim() || textoDoHtml(email.html || "");
  const hash = createHash("sha256").update(conteudo).digest("hex");
  const reconhecido = /grupo easy|grupoeasy|grupo-easy|easytech|easy solutions/i.test(
    semAcentos(`${remetente}\n${assunto}\n${corpo}`),
  );
  const agora = new Date().toISOString();
  const base: ChamadoImportacao = {
    numero_chamado: "",
    empresa_parceira: "",
    cliente: "",
    projeto: "",
    assunto_email: assunto,
    remetente,
    destinatario,
    data_email: email.date ? new Date(email.date).toISOString() : "",
    data_agendada: "",
    hora_agendada: "",
    usuario_responsavel: "",
    contato: "",
    telefone: "",
    endereco: "",
    cidade: "",
    estado: "",
    atividade: "",
    descricao: "",
    equipamento: "",
    fabricante: "",
    modelo: "",
    patrimonio_ae: "",
    numero_serie: "",
    valor_base: null,
    horas_incluidas: null,
    valor_hora_adicional: null,
    status: "Recebido",
    observacoes: "",
    caminho_email: "",
    hash_email: hash,
    corpo_email: corpo,
    criado_em: agora,
    atualizado_em: agora,
  };
  if (!reconhecido) return { chamado: base, reconhecidoGrupoEasy: false, nomeArquivo };

  const dados = extrairCampos(corpo);
  const data = normalizarData(dados.data_agendada || "");
  const hora = normalizarHora(dados.hora_agendada || dados.data_agendada || "");
  const endereco = dados.endereco || "";
  const [cidade, estado] = extrairCidadeEstado(endereco);
  const equipamento = extrairEquipamento(dados.equipamento || "", dados);
  const origemNumero = dados.numero_chamado || assunto;
  const numero = origemNumero.match(/\bMI-\d+(?:-\d+)?\b/i)?.[0].toUpperCase() || "";
  const clienteBruto = dados.cliente?.trim() || "";
  const cliente = intermediadoras.has(semAcentos(clienteBruto).toUpperCase()) ? "" : clienteBruto;

  return {
    nomeArquivo,
    reconhecidoGrupoEasy: true,
    chamado: {
      ...base,
      empresa_parceira: "Grupo Easy",
      numero_chamado: numero,
      cliente,
      projeto: dados.projeto?.trim() || "",
      data_agendada: data,
      hora_agendada: hora,
      usuario_responsavel: dados.contato || "",
      contato: dados.contato || "",
      telefone: dados.telefone || "",
      endereco,
      cidade,
      estado,
      atividade: dados.atividade || "",
      descricao: dados.descricao || "",
      ...equipamento,
      valor_base: numeroDecimal(dados.valor_base),
      horas_incluidas: numeroDecimal(dados.horas_incluidas),
      valor_hora_adicional: numeroDecimal(dados.valor_hora_adicional),
      observacoes: dados.observacoes || "",
      status: data || hora ? "Agendado" : "Recebido",
    },
  };
}
