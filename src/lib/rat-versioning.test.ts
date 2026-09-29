import { describe, expect, it } from "vitest";

import type { RatRegistro, RatRevisao } from "@/lib/rat-types";
import {
  identidadeRegistroRat,
  mesclarRevisaoClaroComCadastroAtual,
  mesclarRevisaoDasaComCadastroAtual,
  ratCompativelComModelo,
  ultimaRevisaoClaroCompativel,
  ultimaRevisaoDasaCompativel,
} from "@/lib/rat-versioning";
import { criarRatDasaValida } from "@/test/fixtures/rat-dasa";

const claro = { chamado: "MI-1", descricao: "Claro" } as RatRevisao;
function registro(dados_revisao: RatRegistro["dados_revisao"], metadados: Partial<RatRegistro> = {}): RatRegistro {
  return {
    id: crypto.randomUUID(), chamado_id: 1, versao: 1, caminho_pdf: "1/rat.pdf", hash_pdf: "a".repeat(64),
    tecnico: "", status_rat: "Gerada", atual: true, gerado_em: "2026-09-15T12:00:00Z", dados_revisao,
    ...metadados,
  };
}

describe("compatibilidade de revisões RAT", () => {
  it("interpreta registros históricos sem metadados como claro-v1", () => {
    const historico = registro(claro);
    expect(identidadeRegistroRat(historico)).toEqual({ modelo_rat: "claro", modelo_versao: 1, schema_versao: 1 });
    expect(ratCompativelComModelo(historico, "claro-v1")).toBe(true);
    expect(ratCompativelComModelo(historico, "dasa-v1")).toBe(false);
  });

  it("não mistura revisões Claro e DASA", () => {
    const dasa = criarRatDasaValida();
    const registros = [
      registro(claro, { versao: 3, modelo_rat: "claro", modelo_versao: 1, schema_versao: 1 }),
      registro(dasa, { versao: 2, modelo_rat: "dasa", modelo_versao: 1, schema_versao: 1 }),
    ];
    expect(ultimaRevisaoClaroCompativel(registros)).toBe(claro);
    expect(ultimaRevisaoDasaCompativel(registros)).toBe(dasa);
  });

  it("ignora mesma família com versão ou schema incompatível", () => {
    const dasa = criarRatDasaValida();
    const incompativel = registro(dasa, { modelo_rat: "dasa", modelo_versao: 2, schema_versao: 2 });
    expect(ratCompativelComModelo(incompativel, "dasa-v1")).toBe(false);
    expect(ultimaRevisaoDasaCompativel([incompativel])).toBeNull();
  });

  it("prioriza o cadastro corrigido nos campos cadastrais de uma nova RAT DASA", () => {
    const cadastro = criarRatDasaValida();
    cadastro.local.endereco = "Avenida Presidente Kennedy, 4121";
    cadastro.local.unidade_nome = "Unidade corrigida";
    cadastro.equipamento.modelo = "Modelo corrigido";
    const revisao = criarRatDasaValida();
    revisao.local.endereco = "Avenida Presindente Kennedy 4121";
    revisao.local.unidade_nome = "Unidade antiga";
    revisao.equipamento.modelo = "Modelo antigo";
    revisao.atendimento.defeito_constatado = "Diagnóstico revisado na RAT v1";

    const resultado = mesclarRevisaoDasaComCadastroAtual(cadastro, revisao);
    expect(resultado.local.endereco).toBe("Avenida Presidente Kennedy, 4121");
    expect(resultado.local.unidade_nome).toBe("Unidade corrigida");
    expect(resultado.equipamento.modelo).toBe("Modelo corrigido");
    expect(resultado.atendimento.defeito_constatado).toBe("Diagnóstico revisado na RAT v1");
  });

  it("prioriza o cadastro corrigido sem perder campos específicos da revisão Claro", () => {
    const cadastro = { ...claro, chamado: "MI-ATUAL", localidade: "Endereço corrigido", telefone: "1111" };
    const revisao = { ...claro, chamado: "MI-ANTIGO", localidade: "Endereço antigo", telefone: "2222", descricao: "Diagnóstico revisado" };

    const resultado = mesclarRevisaoClaroComCadastroAtual(cadastro, revisao);
    expect(resultado.chamado).toBe("MI-ATUAL");
    expect(resultado.localidade).toBe("Endereço corrigido");
    expect(resultado.telefone).toBe("1111");
    expect(resultado.descricao).toBe("Diagnóstico revisado");
  });
});
