import "server-only";

import { marcarContaRecebida, listarContasReceber } from "@/lib/financeiro-repository";
import { FinanceiroService, type FinanceiroGateway } from "@/lib/financeiro-service";

const gateway: FinanceiroGateway = {
  listar: listarContasReceber,
  marcarRecebida: marcarContaRecebida,
};

export const financeiroService = new FinanceiroService(gateway);
