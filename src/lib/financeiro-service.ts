import { z } from "zod";

import type { ContaReceber } from "@/lib/financeiro-types";

export interface FinanceiroGateway {
  listar(): Promise<ContaReceber[]>;
  marcarRecebida(id: string, valor: number, data: string): Promise<void>;
}

const recebimentoSchema = z.object({
  valor_recebido: z.coerce.number().positive("Informe um valor recebido maior que zero."),
  recebido_em: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Informe a data do recebimento."),
});

export class FinanceiroService {
  constructor(private readonly gateway: FinanceiroGateway) {}

  listar() {
    return this.gateway.listar();
  }

  async marcarRecebida(id: string, entrada: unknown) {
    if (!z.string().uuid().safeParse(id).success) throw new Error("Conta inválida.");
    const dados = recebimentoSchema.parse(entrada);
    await this.gateway.marcarRecebida(id, dados.valor_recebido, dados.recebido_em);
  }
}
