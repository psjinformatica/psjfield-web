import { describe, expect, it } from "vitest";

import {
  listarPendenciasRatDasaV1,
  ratDasaFormularioV1Schema,
  validarAssinaturasRatDasaV1,
  validarEstruturaRatDasaV1,
  validarFormularioRatDasaV1,
  validarRatDasaV1ParaGeracao,
} from "@/lib/rat-dasa-validation";
import { criarRatDasaValida } from "@/test/fixtures/rat-dasa";

function caminhosDosErros(entrada: unknown) {
  const resultado = ratDasaFormularioV1Schema.safeParse(entrada);
  if (resultado.success) return [];
  return resultado.error.issues.map((erro) => erro.path.join("."));
}

describe("validação estrutural RAT DASA V1", () => {
  it("aceita o schema versionado e os horários da fixture segura", () => {
    const dados = validarEstruturaRatDasaV1(criarRatDasaValida());

    expect(dados.modelo).toBe("dasa-v1");
    expect(dados.schema_versao).toBe(1);
    expect(dados.tecnico.inicio_data).toBe("2026-09-15");
    expect(dados.tecnico.inicio_hora).toBe("09:00");
    expect(dados.tecnico.termino_data).toBe("2026-09-15");
    expect(dados.tecnico.termino_hora).toBe("12:40");
  });

  it("rejeita outra versão de schema", () => {
    expect(() => validarEstruturaRatDasaV1({ ...criarRatDasaValida(), schema_versao: 2 })).toThrow();
  });

  it("rejeita datas e horários reais inválidos", () => {
    const dados = criarRatDasaValida();
    dados.tecnico.inicio_data = "2026-02-31";
    dados.tecnico.termino_hora = "25:00";

    expect(() => validarEstruturaRatDasaV1(dados)).toThrow();
  });

  it("mantém todos os itens dos checklists individualmente tipados", () => {
    const dados = validarEstruturaRatDasaV1(criarRatDasaValida());

    expect(Object.keys(dados.atendimento.checklist_aplicado)).toEqual([
      "energia", "cabo_video", "demais_perifericos", "rede_rj45", "system_center", "antivirus",
      "limpeza_temporarios", "ativacao_windows_office", "hostname_correto", "problema_reincidente",
    ]);
    expect(Object.keys(dados.atendimento.checklist_formatacao.antes)).toHaveLength(5);
    expect(Object.keys(dados.atendimento.checklist_formatacao.depois)).toHaveLength(6);
  });
});

describe("validação dos campos do formulário DASA", () => {
  it("aceita a fixture completa", () => {
    expect(() => validarFormularioRatDasaV1(criarRatDasaValida())).not.toThrow();
  });

  it("exige os campos obrigatórios sem tornar opcionais obrigatórios", () => {
    const dados = criarRatDasaValida();
    dados.equipamento.chamado_moebius = "";
    dados.local.endereco = "";
    dados.local.cidade = "";
    dados.local.estado = "";
    dados.atendimento.tipo = "";
    dados.atendimento.defeito_informado = "";
    dados.atendimento.defeito_constatado = "";
    dados.atendimento.solucao_aplicada = "";
    dados.cliente.nome_colaborador_acompanhante = "";
    dados.tecnico.nome_tecnico = "";
    dados.tecnico.inicio_data = "";
    dados.tecnico.inicio_hora = "";
    dados.tecnico.termino_data = "";
    dados.tecnico.termino_hora = "";

    expect(caminhosDosErros(dados)).toEqual(expect.arrayContaining([
      "equipamento.chamado_moebius", "local.endereco", "local.cidade", "local.estado", "atendimento.tipo",
      "atendimento.defeito_informado", "atendimento.defeito_constatado", "atendimento.solucao_aplicada",
      "cliente.nome_colaborador_acompanhante", "tecnico.nome_tecnico", "tecnico.inicio_data", "tecnico.inicio_hora",
      "tecnico.termino_data", "tecnico.termino_hora",
    ]));
  });

  it("exige unidade quando ela foi identificada ou sugerida", () => {
    const dados = criarRatDasaValida();
    dados.local.unidade_nome = "";
    expect(caminhosDosErros(dados)).toContain("local.unidade_nome");

    dados.local.unidade_nome_origem = "NAO_IDENTIFICADA";
    expect(caminhosDosErros(dados)).not.toContain("local.unidade_nome");
  });

  it("exige descrição quando o tipo de equipamento é Outro", () => {
    const dados = criarRatDasaValida();
    dados.equipamento.tipo = "Outro";
    dados.equipamento.tipo_outro = "";

    expect(caminhosDosErros(dados)).toContain("equipamento.tipo_outro");
    dados.equipamento.tipo_outro = "Equipamento específico";
    expect(caminhosDosErros(dados)).not.toContain("equipamento.tipo_outro");
  });

  it("exige motivo somente quando há laudo", () => {
    const dados = criarRatDasaValida();
    dados.laudo.laudado = true;
    dados.laudo.motivo = "";
    expect(caminhosDosErros(dados)).toContain("laudo.motivo");

    dados.laudo.laudado = false;
    expect(caminhosDosErros(dados)).not.toContain("laudo.motivo");
  });

  it("apresenta pendências com nomes amigáveis e sem erro técnico", () => {
    const dados = criarRatDasaValida();
    dados.atendimento.defeito_constatado = "";
    dados.cliente.nome_colaborador_acompanhante = "";
    dados.tecnico.termino_data = "";

    expect(listarPendenciasRatDasaV1(dados)).toEqual([
      { campo: "Defeito constatado", mensagem: "Informe o defeito constatado." },
      { campo: "Colaborador que acompanhou o atendimento", mensagem: "Informe o nome do colaborador acompanhante." },
      { campo: "Data de término", mensagem: "Informe a data de término." },
    ]);
  });
});

describe("validação separada das assinaturas", () => {
  it("valida apenas metadados, sem baixar arquivos", () => {
    const dados = criarRatDasaValida();
    expect(() => validarAssinaturasRatDasaV1({
      assinatura_cliente: dados.cliente.assinatura_cliente,
      assinatura_tecnico: dados.tecnico.assinatura_tecnico,
    })).not.toThrow();
  });

  it("aceita a futura geração sem assinatura do colaborador ou do técnico", () => {
    const dados = criarRatDasaValida();
    dados.cliente.assinatura_cliente = null;
    dados.tecnico.assinatura_tecnico = null;

    expect(() => validarFormularioRatDasaV1(dados)).not.toThrow();
    expect(() => validarRatDasaV1ParaGeracao(dados)).not.toThrow();
  });

  it("aceita individualmente a ausência da assinatura do colaborador", () => {
    const dados = criarRatDasaValida();
    dados.cliente.assinatura_cliente = null;

    expect(() => validarRatDasaV1ParaGeracao(dados)).not.toThrow();
  });

  it("aceita individualmente a ausência da assinatura do técnico", () => {
    const dados = criarRatDasaValida();
    dados.tecnico.assinatura_tecnico = null;

    expect(() => validarRatDasaV1ParaGeracao(dados)).not.toThrow();
  });

  it("continua exigindo o nome do colaborador acompanhante", () => {
    const dados = criarRatDasaValida();
    dados.cliente.nome_colaborador_acompanhante = "";

    expect(caminhosDosErros(dados)).toContain("cliente.nome_colaborador_acompanhante");
  });

  it("continua exigindo o nome do técnico", () => {
    const dados = criarRatDasaValida();
    dados.tecnico.nome_tecnico = "";

    expect(caminhosDosErros(dados)).toContain("tecnico.nome_tecnico");
  });
});
