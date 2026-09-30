import { describe, expect, it } from "vitest";

import { calcularTotaisFinanceiros } from "@/lib/financeiro-resumo";
import type { ContaReceber } from "@/lib/financeiro-types";

function conta(situacao: ContaReceber["situacao"], total: string, recebido: string | null): ContaReceber {
  return {
    id: crypto.randomUUID(), chamado_id: 1, numero_chamado: "MI-100", visita_numero: 1,
    quantidade_visitas: 1, encerrado_em: "2026-09-10T15:00:00.000Z", hora_inicio_snapshot: "09:00",
    hora_fim_snapshot: "12:20", duracao_minutos: 200, horas_adicionais: 1, valor_base: "100.00",
    valor_hora_adicional: "30.00", valor_adicional: "30.00", valor_total: total,
    regra_preco: "BASE_100_3H_ADICIONAL_30_V1", origem: "AUTOMATICO", prazo_dias: 35,
    previsao_recebimento: "2026-10-15", situacao, rotulo_situacao: "", revisao_pendente: false,
    recebido_em: situacao === "RECEBIDO" ? "2026-10-14" : null, valor_recebido: recebido, observacoes: "",
  };
}

describe("resumo financeiro", () => {
  it("retira o valor dos recebidos e o devolve ao total em aberto após a reversão", () => {
    const pendente = conta("A_RECEBER", "100.00", null);
    const recebida = conta("RECEBIDO", "130.00", "125.50");
    expect(calcularTotaisFinanceiros([pendente, recebida])).toEqual({ em_aberto: 100, recebido: 125.5 });

    const revertida = { ...recebida, situacao: "A_RECEBER", recebido_em: null, valor_recebido: null } as ContaReceber;
    expect(calcularTotaisFinanceiros([pendente, revertida])).toEqual({ em_aberto: 230, recebido: 0 });
  });
});
