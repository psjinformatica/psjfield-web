import { describe, expect, it } from "vitest";

import { mapChamadoParaRatDasa } from "@/lib/rat-dasa-mapper";
import {
  TIPOS_ATENDIMENTO_DASA,
  TIPOS_EQUIPAMENTO_DASA,
} from "@/lib/rat-dasa-types";
import { chamadoDasaSeguro, tecnicoDasaSeguro } from "@/test/fixtures/rat-dasa";

describe("domínio RAT DASA V1", () => {
  it("expõe os tipos de atendimento e equipamento do formulário oficial", () => {
    expect(TIPOS_ATENDIMENTO_DASA).toEqual(["FIELD_SERVICES", "REMOTE_HANDS", "RDM", "PROJETO"]);
    expect(TIPOS_EQUIPAMENTO_DASA).toEqual([
      "Desktop", "Monitor", "Etiquetadora", "SRX", "Notebook", "Impressora", "Ponto de Rede", "Servidor", "Outro",
    ]);
  });
});

describe("mapChamadoParaRatDasa", () => {
  it("mapeia somente dados existentes e marca a unidade como sugestão revisável", () => {
    const dados = mapChamadoParaRatDasa(chamadoDasaSeguro, {
      tecnico: tecnicoDasaSeguro,
      tipoAtendimentoSugerido: "FIELD_SERVICES",
    });

    expect(dados).toMatchObject({
      modelo: "dasa-v1",
      schema_versao: 1,
      local: {
        unidade_nome: "UNIDADE-TESTE",
        unidade_nome_origem: "EQUIPAMENTO_SUGERIDO",
        solicitante: "Solicitante Exemplo",
        endereco: "Endereço de teste, 100",
        cidade: "Cidade Teste",
        estado: "PR",
      },
      equipamento: { chamado_moebius: "SR-855635" },
      atendimento: {
        tipo: "FIELD_SERVICES",
        defeito_informado: "Conectividade da unidade indisponível",
        solucao_aplicada: "Conexões verificadas e diagnóstico registrado",
      },
      tecnico: {
        nome_tecnico: "Técnico Exemplo",
        inicio_hora: "09:00",
        termino_hora: "12:40",
      },
    });
    expect(dados.local.unidade_nome).toBe(chamadoDasaSeguro.equipamento);
  });

  it("não inventa diagnóstico, datas reais, signatário, checklists ou respostas opcionais", () => {
    const dados = mapChamadoParaRatDasa(chamadoDasaSeguro);

    expect(dados.atendimento.tipo).toBe("");
    expect(dados.atendimento.defeito_constatado).toBe("");
    expect(dados.tecnico.inicio_data).toBe("");
    expect(dados.tecnico.termino_data).toBe("");
    expect(dados.cliente.nome_colaborador_acompanhante).toBe("");
    expect(dados.cliente.assinatura_cliente).toBeNull();
    expect(dados.tecnico.assinatura_tecnico).toBeNull();
    expect(Object.values(dados.atendimento.checklist_aplicado).every((valor) => valor === false)).toBe(true);
    expect(Object.values(dados.atendimento.checklist_formatacao.antes).every((valor) => valor === false)).toBe(true);
    expect(Object.values(dados.atendimento.checklist_formatacao.depois).every((valor) => valor === false)).toBe(true);
    expect(dados.atendimento.problema_solucionado).toBeNull();
    expect(dados.atendimento.visita_improdutiva).toBeNull();
    expect(dados.laudo.laudado).toBeNull();
    expect(dados.laudo.motivo).toBe("");
    expect(dados.equipamento.tipo).toBe("");
    expect(dados.cliente.avaliacao).toBe("");
  });

  it("mantém solicitante e colaborador acompanhante como conceitos distintos", () => {
    const dados = mapChamadoParaRatDasa(chamadoDasaSeguro);

    expect(dados.local.solicitante).toBe("Solicitante Exemplo");
    expect(dados.cliente.nome_colaborador_acompanhante).toBe("");
  });

  it("não transforma a data agendada em data real", () => {
    const dados = mapChamadoParaRatDasa(chamadoDasaSeguro);

    expect(chamadoDasaSeguro.data_agendada).toBe("2026-09-15");
    expect(dados.tecnico.inicio_data).toBe("");
    expect(dados.tecnico.termino_data).toBe("");
    expect(dados.tecnico.inicio_hora).toBe("09:00");
    expect(dados.tecnico.termino_hora).toBe("12:40");
  });

  it("só sugere Field Services quando a origem chama o mapper com essa sugestão", () => {
    expect(mapChamadoParaRatDasa(chamadoDasaSeguro).atendimento.tipo).toBe("");
    expect(mapChamadoParaRatDasa(chamadoDasaSeguro, { tipoAtendimentoSugerido: "FIELD_SERVICES" }).atendimento.tipo)
      .toBe("FIELD_SERVICES");
  });

  it("obtém o nome do técnico da configuração existente, sem valor pessoal fixo", () => {
    expect(mapChamadoParaRatDasa(chamadoDasaSeguro).tecnico.nome_tecnico).toBe("");
    expect(mapChamadoParaRatDasa(chamadoDasaSeguro, {
      tecnico: { ...tecnicoDasaSeguro, nome_tecnico: "Outro Técnico Configurado" },
    }).tecnico.nome_tecnico).toBe("Outro Técnico Configurado");
  });

  it("usa descrição como fallback do defeito informado quando atividade está vazia", () => {
    const dados = mapChamadoParaRatDasa({ ...chamadoDasaSeguro, atividade: "", descricao: "Defeito descrito no acionamento" });

    expect(dados.atendimento.defeito_informado).toBe("Defeito descrito no acionamento");
  });

  it("reflete explicitamente status Improdutivo sem inferir os demais booleanos", () => {
    const dados = mapChamadoParaRatDasa({ ...chamadoDasaSeguro, status: "Improdutivo" });

    expect(dados.atendimento.visita_improdutiva).toBe(true);
    expect(dados.atendimento.problema_solucionado).toBeNull();
  });
});
