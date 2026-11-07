import "server-only";

import {
  listarContasReceber,
  marcarContaRecebida,
  reverterContaRecebida,
} from "@/lib/financeiro-repository";
import { FinanceiroService, type FinanceiroGateway } from "@/lib/financeiro-service";
import { aplicarCorrecaoFinanceira, prepararCorrecaoFinanceira } from "@/lib/financeiro-correcao-repository";

const gateway: FinanceiroGateway = {
  listar: listarContasReceber,
  marcarRecebida: marcarContaRecebida,
  reverterRecebimento: reverterContaRecebida,
  prepararCorrecao: prepararCorrecaoFinanceira,
  aplicarCorrecao: aplicarCorrecaoFinanceira,
};

export const financeiroService = new FinanceiroService(gateway);
