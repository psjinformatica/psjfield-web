import { resolverPoliticaFinanceira } from "@/lib/financeiro-politicas";
import { VALOR_BASE_ATUAL } from "@/lib/financeiro-types";
import { statusGeraRecebimento } from "@/lib/status";

type ChamadoComValor = {
  cliente: string;
  status: string;
  valor_base: string | null;
  valor_financeiro: string | null;
};

export type ValorCardChamado = {
  valor_card: string | null;
  pendencia_financeira: boolean;
};

export function resolverValorCardChamado(chamado: ChamadoComValor): ValorCardChamado {
  if (chamado.valor_financeiro !== null) {
    return { valor_card: chamado.valor_financeiro, pendencia_financeira: false };
  }

  if (statusGeraRecebimento(chamado.status)) {
    return { valor_card: null, pendencia_financeira: true };
  }

  const emAndamento = chamado.status === "Agendado" || chamado.status === "Em atendimento";
  if (emAndamento && resolverPoliticaFinanceira(chamado.cliente)) {
    return {
      valor_card: chamado.valor_base ?? VALOR_BASE_ATUAL.toFixed(2),
      pendencia_financeira: false,
    };
  }

  return { valor_card: null, pendencia_financeira: false };
}
