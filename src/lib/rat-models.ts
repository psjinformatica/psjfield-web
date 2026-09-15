import type { Chamado } from "@/lib/types";

export const MODELOS_RAT = ["claro-v1", "dasa-v1"] as const;

export type ModeloRat = (typeof MODELOS_RAT)[number];
export type ModeloRatImplementado = ModeloRat;

const CLIENTES_DASA = new Set([
  "dasa",
  "dasa sa",
  "dasa s a",
  "diagnosticos da america",
  "diagnosticos da america sa",
  "diagnosticos da america s a",
]);

export function normalizarClienteRat(cliente: string | null | undefined) {
  return (cliente || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .replace(/[./_-]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function resolverModeloRat(chamado: Pick<Chamado, "cliente">): ModeloRat {
  return CLIENTES_DASA.has(normalizarClienteRat(chamado.cliente)) ? "dasa-v1" : "claro-v1";
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
