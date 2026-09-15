import { describe, expect, it } from "vitest";

import { chamadoSimulacaoRatDasa, criarSimulacaoRatDasa } from "@/lib/rat-dasa-simulation";

describe("simulação local RAT DASA", () => {
  it("representa o atendimento de referência sem dados pessoais reais", () => {
    const dados = criarSimulacaoRatDasa();

    expect(chamadoSimulacaoRatDasa).toMatchObject({ id: 20, numero_chamado: "SR-855635", cliente: "DASA" });
    expect(dados.atendimento.tipo).toBe("FIELD_SERVICES");
    expect(dados.tecnico).toMatchObject({
      nome_tecnico: "Técnico Exemplo",
      inicio_data: "2026-09-15",
      inicio_hora: "09:00",
      termino_data: "2026-09-15",
      termino_hora: "12:40",
      assinatura_tecnico: null,
    });
    expect(dados.cliente).toMatchObject({
      nome_colaborador_acompanhante: "Colaborador Exemplo",
      assinatura_cliente: null,
    });
  });

  it("mantém todas as marcações opcionais vazias", () => {
    const dados = criarSimulacaoRatDasa();

    expect(Object.values(dados.atendimento.checklist_aplicado).every((valor) => valor === false)).toBe(true);
    expect(Object.values(dados.atendimento.checklist_formatacao.antes).every((valor) => valor === false)).toBe(true);
    expect(Object.values(dados.atendimento.checklist_formatacao.depois).every((valor) => valor === false)).toBe(true);
    expect(dados.atendimento.problema_solucionado).toBeNull();
    expect(dados.atendimento.visita_improdutiva).toBeNull();
    expect(dados.cliente.avaliacao).toBe("");
    expect(dados.laudo.laudado).toBeNull();
  });
});
