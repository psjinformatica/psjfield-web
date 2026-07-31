import type { StatusFinalizacao } from "@/lib/types";

export const STATUS_OPERACIONAIS = [
  "Agendado",
  "Em atendimento",
  "Concluído",
  "Improdutivo",
  "Cancelado",
] as const;

export const STATUS_FINALIZACAO: StatusFinalizacao[] = [
  "Concluído",
  "Improdutivo",
  "Cancelado",
];

export function statusEncerraAtendimento(status: string) {
  return STATUS_FINALIZACAO.includes(status as StatusFinalizacao);
}

export function statusGeraRecebimento(status: string) {
  return status === "Concluído" || status === "Improdutivo";
}

export function horarioAtualSaoPaulo(data = new Date()) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(data);
}
