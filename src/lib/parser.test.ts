import { describe, expect, it } from "vitest";

import { extrairCampos, interpretarEml, normalizarData, normalizarHora } from "@/lib/parser";

function eml(corpo: string, assunto = "Acionamento MI-285611-2") {
  return new TextEncoder().encode(
    `From: Grupo Easy <operacoes@grupoeasy.example>\r\n` +
    `To: tecnico@example.invalid\r\n` +
    `Subject: ${assunto}\r\n` +
    `Date: Thu, 30 Jul 2026 10:00:00 -0300\r\n` +
    `Content-Type: text/plain; charset=utf-8\r\n\r\n${corpo}`,
  );
}

describe("interpretarEml", () => {
  it("porta os principais campos do parser Grupo Easy", async () => {
    const previa = await interpretarEml(eml(
      "CLIENTE: Claro\r\nPROJETO: Renovação\r\nDATA: 31/07/2026 às 14h\r\n" +
      "ENDEREÇO: Av Cândido de Abreu 127 Centro 80.530-900 Curitiba PR\r\n" +
      "EQUIPAMENTO: Desktop Lenovo M70q Serial: PE06HTER AE: 1221046\r\n" +
      "VALOR: R$ 100,00\r\nHORA ADICIONAL: R$ 30,00",
    ), "teste.eml");
    expect(previa.reconhecidoGrupoEasy).toBe(true);
    expect(previa.chamado.numero_chamado).toBe("MI-285611-2");
    expect(previa.chamado.cliente).toBe("Claro");
    expect(previa.chamado.data_agendada).toBe("2026-07-31");
    expect(previa.chamado.hora_agendada).toBe("14:00");
    expect(previa.chamado.cidade).toBe("Curitiba");
    expect(previa.chamado.estado).toBe("PR");
    expect(previa.chamado.valor_base).toBe("100");
    expect(previa.chamado.hash_email).toHaveLength(64);
    expect(previa.chamado.status).toBe("Agendado");
  });

  it("não classifica a intermediadora como cliente", async () => {
    const previa = await interpretarEml(eml("CLIENTE: Easytech"), "teste.eml");
    expect(previa.chamado.cliente).toBe("");
  });

  it("reconhece rótulos DASA somente quando há correspondência semântica direta", async () => {
    const corpo = [
      "CLIENTE: DASA",
      "CHAMADO INTERNO: SR-900001",
      "Defeito ou solicitação: Falha de conectividade informada",
      "Nome da unidade: Unidade Diagnóstico | Filial 01",
      "EQUIPAMENTO: Etiquetadora",
      "Endereço de atendimento: Rua Exemplo, 100 - Centro, Curitiba - PR, 80000-000",
      "Nome do solicitante: Solicitante Exemplo",
      "Telefone:",
    ].join("\r\n");
    const extraidos = extrairCampos(corpo);
    const previa = await interpretarEml(eml(corpo, "Atendimento DASA SR-900001"), "dasa.eml");

    expect(extraidos.unidade_nome).toBe("Unidade Diagnóstico | Filial 01");
    expect(previa.chamado).toMatchObject({
      numero_chamado: "SR-900001",
      cliente: "DASA",
      contato: "Solicitante Exemplo",
      unidade_nome: "Unidade Diagnóstico | Filial 01",
      endereco: "Rua Exemplo, 100 - Centro, Curitiba - PR, 80000-000",
      cidade: "Curitiba",
      estado: "PR",
      atividade: "Falha de conectividade informada",
      equipamento: "Etiquetadora",
      fabricante: "",
      modelo: "",
      patrimonio_ae: "",
      numero_serie: "",
    });
  });

  it("interpreta a nova variação DASA INC sem inferir dados não estruturados", async () => {
    const corpo = [
      "Data 01/10",
      "Horário 09:00h",
      "Valor R$ 100,00",
      "",
      "CLIENTE: DASA Chamado para atendimento",
      "CHAMADO INTERNO:#INC-924376",
      "SLA:1h 8m",
      "Defeito ou solicitação: Precisamos de Field para fixar o ponto de rede informado no acionamento",
      "Localidade: UNIDADE EXEMPLO | Unidade | D265 | CENTRO",
      "Horário de funcionamento: Seg. a sex. das 06h30 às 17h",
      "Endereço: RUA EXEMPLO 369 - Cidade: CURITIBA/PR - Cep: 80240-220",
      "Nome do solicitante: Solicitante Exemplo",
      "telefone: (41) 3333-0000",
      "E-mail: solicitante@example.invalid",
      "Telefone do Suporte: Suporte (71) 9000-0000 123456",
    ].join("\r\n");
    const previa = await interpretarEml(eml(corpo, "Novo atendimento DASA"), "dasa-inc.eml");

    expect(previa.chamado).toMatchObject({
      numero_chamado: "INC-924376",
      cliente: "DASA Chamado para atendimento",
      data_agendada: "2026-10-01",
      hora_agendada: "09:00",
      valor_base: "100",
      unidade_nome: "UNIDADE EXEMPLO | Unidade | D265 | CENTRO",
      endereco: "RUA EXEMPLO 369 - CEP: 80240-220",
      cidade: "CURITIBA",
      estado: "PR",
      contato: "Solicitante Exemplo",
      telefone: "(41) 3333-0000",
      atividade: "Precisamos de Field para fixar o ponto de rede informado no acionamento",
      equipamento: "",
    });
    expect(previa.chamado.corpo_email).toContain("solicitante@example.invalid");
    expect(previa.chamado.telefone).not.toContain("Suporte");
  });

  it("só completa ano ausente quando a data do e-mail torna o mesmo ano inequívoco", () => {
    expect(normalizarData("01/10", "2026-09-30T13:00:00.000Z")).toBe("2026-10-01");
    expect(normalizarData("01/10")).toBe("");
    expect(normalizarData("01/01", "2026-12-31T13:00:00.000Z")).toBe("");
  });

  it.each(["09:00", "09:00h", "09h00"])("normaliza horário seguro %s", (valor) => {
    expect(normalizarHora(valor)).toBe("09:00");
  });

  it("não confunde horário de funcionamento com o horário agendado sem separador", () => {
    expect(extrairCampos([
      "Horário de funcionamento: Seg. a sex. das 06h30 às 17h",
      "Horário 09:00h",
    ].join("\n")).hora_agendada).toBe("09:00h");
  });

  it("preserva somente metadados e corpo em e-mail genérico", async () => {
    const conteudo = new TextEncoder().encode(
      "From: cliente@example.invalid\r\nSubject: Pedido\r\nContent-Type: text/plain\r\n\r\nCLIENTE: Não extrair",
    );
    const previa = await interpretarEml(conteudo, "generico.eml");
    expect(previa.reconhecidoGrupoEasy).toBe(false);
    expect(previa.chamado.cliente).toBe("");
    expect(previa.chamado.corpo_email).toContain("CLIENTE");
    expect(previa.chamado.status).toBe("Agendado");
  });
});
