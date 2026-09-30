import type { ContaReceber } from "@/lib/financeiro-types";

export function calcularTotaisFinanceiros(contas: ContaReceber[]) {
  return contas.reduce((totais, conta) => {
    if (conta.situacao === "RECEBIDO") {
      totais.recebido += Number(conta.valor_recebido || 0);
    } else {
      totais.em_aberto += Number(conta.valor_total || 0);
    }
    return totais;
  }, { em_aberto: 0, recebido: 0 });
}
