import type { Chamado } from "@/lib/types";

export const MODELOS_RAT = ["claro-v1", "dasa-v1"] as const;

export type ModeloRat = (typeof MODELOS_RAT)[number];
export type ModeloRatImplementado = ModeloRat;

const PADROES_CLIENTE_DASA = [
  /^dasa(?: s a)?$/,
  /^diagnosticos da america(?: s a)?$/,
  /^dasa(?: s a)? chamado para atendimento$/,
];

export function normalizarClienteRat(cliente: string | null | undefined) {
  return (cliente || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function resolverModeloRat(chamado: Pick<Chamado, "cliente">): ModeloRat {
  const cliente = normalizarClienteRat(chamado.cliente);
  return PADROES_CLIENTE_DASA.some((padrao) => padrao.test(cliente)) ? "dasa-v1" : "claro-v1";
}

export function modeloRatImplementado(modelo: ModeloRat): modelo is ModeloRatImplementado {
  return MODELOS_RAT.includes(modelo);
}

export function mensagemModeloRatIndisponivel(modelo: ModeloRat) {
  if (modelo === "dasa-v1") return "Modelo RAT DASA em preparação";
  return "Modelo de RAT ainda não disponível";
}

export function exigirModeloRatImplementado(modelo: ModeloRat): asserts modelo is ModeloRatImplementado {
  if (!modeloRatImplementado(modelo)) {
    throw new Error(mensagemModeloRatIndisponivel(modelo));
  }
}
