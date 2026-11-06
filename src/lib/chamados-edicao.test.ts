import { describe, expect, it } from "vitest";

import {
  CAMPOS_COMPARTILHAVEIS_VISITAS,
  CAMPOS_EDICAO_CHAMADO,
  CAMPOS_FINANCEIROS_CHAMADO,
  camposAlterados,
  dadosEditaveisDoChamado,
  validarSolicitacaoEdicaoChamado,
} from "@/lib/chamados-edicao";
import { chamadoDasaSeguro } from "@/test/fixtures/rat-dasa";

function entrada() {
  return {
    dados: dadosEditaveisDoChamado(chamadoDasaSeguro),
    escopo: "SOMENTE_ESTA_VISITA",
    versao_dados: "a".repeat(64),
    versao_grupo: "b".repeat(64),
  };
}

describe("edição cadastral do chamado", () => {
  it("mantém allowlist explícita e exclui dados internos, atendimento, RAT e Financeiro", () => {
    expect(CAMPOS_EDICAO_CHAMADO).toContain("unidade_nome");
    expect(CAMPOS_EDICAO_CHAMADO).toContain("endereco");
    expect(CAMPOS_EDICAO_CHAMADO).toContain("data_agendada");
    expect(CAMPOS_EDICAO_CHAMADO).toContain("hora_agendada");
    expect(CAMPOS_EDICAO_CHAMADO).not.toContain("status");
    expect(CAMPOS_EDICAO_CHAMADO).not.toContain("visualizado_em");
    expect(CAMPOS_EDICAO_CHAMADO).not.toContain("hora_inicio");
    expect(CAMPOS_EDICAO_CHAMADO).not.toContain("hash_email");
    expect(CAMPOS_EDICAO_CHAMADO).not.toContain("dados_revisao");
    expect(CAMPOS_EDICAO_CHAMADO).not.toContain("valor_recebido");
  });

  it("aceita correções cadastrais nos formatos vigentes", () => {
    const dados = entrada();
    dados.dados.numero_chamado = "SR-906366";
    dados.dados.endereco = "Avenida Presidente Kennedy, 4121";
    dados.dados.unidade_nome = "FRISCHMANN | Unidade | D279 | FS - PALLADIUM";
    dados.dados.valor_base = "100,00";

    expect(validarSolicitacaoEdicaoChamado(dados).dados).toMatchObject({
      numero_chamado: "SR-906366",
      endereco: "Avenida Presidente Kennedy, 4121",
      valor_base: "100.00",
    });
  });

  it("aceita data civil e horário válidos, inclusive alteração independente e campos vazios", () => {
    const ambos = entrada();
    ambos.dados.data_agendada = "2026-11-05";
    ambos.dados.hora_agendada = "13:00";
    expect(validarSolicitacaoEdicaoChamado(ambos).dados).toMatchObject({
      data_agendada: "2026-11-05",
      hora_agendada: "13:00",
    });

    const semData = entrada();
    semData.dados.data_agendada = "";
    semData.dados.hora_agendada = "13:00";
    expect(validarSolicitacaoEdicaoChamado(semData).dados).toMatchObject({
      data_agendada: "",
      hora_agendada: "13:00",
    });

    const semHorario = entrada();
    semHorario.dados.data_agendada = "2026-11-05";
    semHorario.dados.hora_agendada = "";
    expect(validarSolicitacaoEdicaoChamado(semHorario).dados).toMatchObject({
      data_agendada: "2026-11-05",
      hora_agendada: "",
    });
  });

  it.each([
    ["2026-02-29", "13:00", "data inexistente"],
    ["2026-13-01", "13:00", "mês inexistente"],
    ["05/11/2026", "13:00", "formato de data inválido"],
    ["2026-11-05", "24:00", "hora inexistente"],
    ["2026-11-05", "13:60", "minuto inexistente"],
  ])("rejeita %s / %s (%s)", (data, hora) => {
    const dados = entrada();
    dados.dados.data_agendada = data;
    dados.dados.hora_agendada = hora;
    expect(() => validarSolicitacaoEdicaoChamado(dados)).toThrow();
  });

  it("aceita INC na edição pós-criação sem aceitar sufixo não comprovado", () => {
    const valido = entrada();
    valido.dados.numero_chamado = "INC-924376";
    expect(validarSolicitacaoEdicaoChamado(valido).dados.numero_chamado).toBe("INC-924376");

    const invalido = entrada();
    invalido.dados.numero_chamado = "INC-924376-2";
    expect(() => validarSolicitacaoEdicaoChamado(invalido)).toThrow("Número do chamado inválido");
  });

  it.each([
    [{ status: "Concluído" }, "campo interno"],
    [{ hash_email: "alterado" }, "hash do e-mail"],
    [{ valor_recebido: "1" }, "Financeiro"],
  ])("rejeita propriedade arbitrária de %s", (extra) => {
    const dados = entrada() as Record<string, unknown> & { dados: Record<string, unknown> };
    dados.dados = { ...dados.dados, ...extra };
    expect(() => validarSolicitacaoEdicaoChamado(dados)).toThrow();
  });

  it("rejeita número externo e parâmetros financeiros inválidos", () => {
    const numero = entrada();
    numero.dados.numero_chamado = "DASA-123";
    expect(() => validarSolicitacaoEdicaoChamado(numero)).toThrow("Número do chamado inválido");

    const financeiro = entrada();
    financeiro.dados.valor_hora_adicional = "-30";
    expect(() => validarSolicitacaoEdicaoChamado(financeiro)).toThrow("número não negativo");
  });

  it("classifica campos compartilháveis, próprios e financeiros", () => {
    expect(CAMPOS_COMPARTILHAVEIS_VISITAS).toContain("endereco");
    expect(CAMPOS_COMPARTILHAVEIS_VISITAS).toContain("numero_chamado");
    expect(CAMPOS_COMPARTILHAVEIS_VISITAS).not.toContain("descricao");
    expect(CAMPOS_COMPARTILHAVEIS_VISITAS).not.toContain("observacoes");
    expect(CAMPOS_COMPARTILHAVEIS_VISITAS).not.toContain("data_agendada");
    expect(CAMPOS_COMPARTILHAVEIS_VISITAS).not.toContain("hora_agendada");
    expect(CAMPOS_FINANCEIROS_CHAMADO).toEqual(["valor_base", "horas_incluidas", "valor_hora_adicional"]);
  });

  it("identifica somente os campos efetivamente alterados", () => {
    const anterior = dadosEditaveisDoChamado(chamadoDasaSeguro);
    const novo = { ...anterior, endereco: "Endereço corrigido", telefone: "(41) 99999-9999" };
    expect(camposAlterados(anterior, novo)).toEqual(["telefone", "endereco"]);
  });
});
