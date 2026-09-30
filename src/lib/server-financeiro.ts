import "server-only";

import {
  listarContasReceber,
  marcarContaRecebida,
  reverterContaRecebida,
} from "@/lib/financeiro-repository";
import { FinanceiroService, type FinanceiroGateway } from "@/lib/financeiro-service";

const gateway: FinanceiroGateway = {
  listar: listarContasReceber,
  marcarRecebida: marcarContaRecebida,
  reverterRecebimento: reverterContaRecebida,
};

export const financeiroService = new FinanceiroService(gateway);
