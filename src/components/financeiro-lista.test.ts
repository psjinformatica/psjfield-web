import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import {
  ConfirmacaoReversaoRecebimento,
  filtrarContasFinanceiro,
  identificacaoVisitaFinanceiro,
  indicadoresContaFinanceiro,
  podeReverterRecebimento,
  solicitarReversaoRecebimento,
} from "@/components/financeiro-lista";
import type { ContaReceber } from "@/lib/financeiro-types";

function conta(situacao: ContaReceber["situacao"], id = "conta-1"): ContaReceber {
  return {
    id,
    chamado_id: 1,
    numero_chamado: "MI-100",
    visita_numero: 1,
    quantidade_visitas: 1,
    encerrado_em: "2026-09-10T15:00:00.000Z",
    hora_inicio_snapshot: "09:00",
    hora_fim_snapshot: "12:20",
    duracao_minutos: 200,
    horas_adicionais: 1,
    valor_base: "100.00",
    valor_hora_adicional: "30.00",
    valor_adicional: "30.00",
    valor_total: "130.00",
    regra_preco: "BASE_100_3H_ADICIONAL_30_V1",
    origem: "AUTOMATICO",
    prazo_dias: 35,
    previsao_recebimento: "2026-10-15",
    situacao,
    rotulo_situacao: situacao === "RECEBIDO" ? "Recebido" : "A receber",
    revisao_pendente: false,
    recebido_em: situacao === "RECEBIDO" ? "2026-10-14" : null,
    valor_recebido: situacao === "RECEBIDO" ? "130.00" : null,
    observacoes: "",
  };
}

describe("indicadores dos cards financeiros", () => {
  it("mostra previsão enquanto o recebível está pendente", () => {
    expect(indicadoresContaFinanceiro(conta("A_RECEBER"))).toEqual([
      { rotulo: "Valor", valor: "R$ 130,00" },
      { rotulo: "Previsão", valor: "15/10/2026" },
      { rotulo: "Duração", valor: "3h20" },
      { rotulo: "Origem", valor: "Automático" },
    ]);
  });

  it("mostra a data real, sem apagar a previsão, quando recebido", () => {
    const recebida = conta("RECEBIDO");
    recebida.valor_recebido = "125.50";
    expect(indicadoresContaFinanceiro(recebida)).toEqual([
      { rotulo: "Valor", valor: "R$ 125,50" },
      { rotulo: "Recebido em", valor: "14/10/2026" },
      { rotulo: "Duração", valor: "3h20" },
      { rotulo: "Origem", valor: "Automático" },
    ]);
    expect(recebida.previsao_recebimento).toBe("2026-10-15");
    expect(recebida.valor_recebido).toBe("125.50");
  });

  it("preserva a ordem original ao aplicar todos os filtros", () => {
    const contas = [conta("A_RECEBER", "1"), conta("RECEBIDO", "2"), conta("EM_REVISAO", "3")];
    expect(filtrarContasFinanceiro(contas, "TODOS").map(({ id }) => id)).toEqual(["1", "2", "3"]);
    expect(filtrarContasFinanceiro(contas, "A_RECEBER").map(({ id }) => id)).toEqual(["1"]);
    expect(filtrarContasFinanceiro(contas, "RECEBIDO").map(({ id }) => id)).toEqual(["2"]);
    expect(filtrarContasFinanceiro(contas, "EM_REVISAO").map(({ id }) => id)).toEqual(["3"]);
  });

  it("distingue recebíveis do mesmo chamado externo por visita", () => {
    expect(identificacaoVisitaFinanceiro({ visita_numero: 1, quantidade_visitas: 2 })).toBe("Visita 1");
    expect(identificacaoVisitaFinanceiro({ visita_numero: 2, quantidade_visitas: 2 })).toBe("Visita 2");
    expect(identificacaoVisitaFinanceiro({ visita_numero: 1, quantidade_visitas: 1 })).toBeNull();
  });

  it.each([
    ["A_RECEBER", false],
    ["EM_REVISAO", false],
    ["RECEBIDO", true],
  ] as const)("controla a ação de reversão no estado %s", (situacao, esperado) => {
    expect(podeReverterRecebimento(conta(situacao))).toBe(esperado);
  });

  it("apresenta a confirmação e as duas ações previstas", () => {
    const html = renderToStaticMarkup(createElement(ConfirmacaoReversaoRecebimento, {
      desabilitada: false,
      onCancelar: () => undefined,
      onConfirmar: () => undefined,
    }));

    expect(html).toContain("Reverter recebimento?");
    expect(html).toContain("Este chamado voltará para contas a receber e os dados do recebimento registrado serão removidos.");
    expect(html).toContain("O atendimento original não será alterado.");
    expect(html).toContain(">Cancelar</button>");
    expect(html).toContain(">Reverter recebimento</button>");
  });

  it("cancelar não chama a API e confirmar usa uma única operação de reversão", async () => {
    const solicitar = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
    await expect(solicitarReversaoRecebimento("conta-1", false, solicitar)).resolves.toBe(false);
    expect(solicitar).not.toHaveBeenCalled();

    await expect(solicitarReversaoRecebimento("conta-1", true, solicitar)).resolves.toBe(true);
    expect(solicitar).toHaveBeenCalledOnce();
    expect(solicitar).toHaveBeenCalledWith("/api/financeiro/conta-1/reverter", { method: "POST" });
  });

  it("após a reversão remove data e valor recebido, volta aos filtros pendentes e exibe previsão", () => {
    const recebida = conta("RECEBIDO");
    const revertida: ContaReceber = {
      ...recebida,
      situacao: "A_RECEBER",
      rotulo_situacao: "Previsão atingida",
      recebido_em: null,
      valor_recebido: null,
    };

    expect(filtrarContasFinanceiro([revertida], "RECEBIDO")).toEqual([]);
    expect(filtrarContasFinanceiro([revertida], "A_RECEBER")).toEqual([revertida]);
    expect(indicadoresContaFinanceiro(revertida)).toEqual([
      { rotulo: "Valor", valor: "R$ 130,00" },
      { rotulo: "Previsão", valor: "15/10/2026" },
      { rotulo: "Duração", valor: "3h20" },
      { rotulo: "Origem", valor: "Automático" },
    ]);
  });
});
