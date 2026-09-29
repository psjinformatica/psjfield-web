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
    expect(CAMPOS_FINANCEIROS_CHAMADO).toEqual(["valor_base", "horas_incluidas", "valor_hora_adicional"]);
  });

  it("identifica somente os campos efetivamente alterados", () => {
    const anterior = dadosEditaveisDoChamado(chamadoDasaSeguro);
    const novo = { ...anterior, endereco: "Endereço corrigido", telefone: "(41) 99999-9999" };
    expect(camposAlterados(anterior, novo)).toEqual(["telefone", "endereco"]);
  });
});
