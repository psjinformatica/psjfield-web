import { describe, expect, it } from "vitest";

import {
  CAMPOS_PREVIEW_IMPORTACAO,
  aplicarRevisaoImportacao,
  validarRevisaoImportacao,
} from "@/lib/importacao-campos";
import type { ChamadoImportacao } from "@/lib/types";

function importacao(): ChamadoImportacao {
  return {
    numero_chamado: "SR-900001", empresa_parceira: "Grupo Easy", cliente: "DASA", projeto: "DASA",
    assunto_email: "Atendimento SR-900001", remetente: "origem@example.invalid", destinatario: "destino@example.invalid",
    data_email: "2026-09-29T10:00:00.000Z", data_agendada: "2026-09-30", hora_agendada: "09:30",
    usuario_responsavel: "Solicitante original", contato: "Solicitante original", telefone: "",
    unidade_nome: "Unidade original", endereco: "Avenida Presindente Kennedy 4121", cidade: "Curitiba", estado: "PR",
    atividade: "Falha informada", descricao: "", equipamento: "Etiquetadora", fabricante: "ZEBRA",
    modelo: "ZD220T", patrimonio_ae: "N/A", numero_serie: "SERIE-1", valor_base: "100",
    horas_incluidas: "3", valor_hora_adicional: "30", status: "Agendado", observacoes: "",
    caminho_email: "", hash_email: "a".repeat(64), corpo_email: "corpo original",
    criado_em: "2026-09-29T10:00:00.000Z", atualizado_em: "2026-09-29T10:00:00.000Z",
  };
}

describe("revisão editável da importação", () => {
  it("expõe os campos operacionais persistidos, inclusive unidade e horas incluídas", () => {
    expect(CAMPOS_PREVIEW_IMPORTACAO).toEqual(expect.arrayContaining([
      ["unidade_nome", "Unidade/Nome"],
      ["endereco", "Endereço"],
      ["equipamento", "Equipamento"],
      ["usuario_responsavel", "Usuário responsável/Login"],
      ["horas_incluidas", "Horas incluídas"],
    ]));
  });

  it("prioriza correções humanas e preserva valores que não foram editados", () => {
    const original = importacao();
    const revisado = validarRevisaoImportacao(original, {
      unidade_nome: "FRISCHMANN | Unidade | D279 | FS - PALLADIUM",
      endereco: "Avenida Presidente Kennedy, 4121",
      equipamento: "Etiquetadora",
    });

    expect(revisado).toMatchObject({
      unidade_nome: "FRISCHMANN | Unidade | D279 | FS - PALLADIUM",
      endereco: "Avenida Presidente Kennedy, 4121",
      equipamento: "Etiquetadora",
      fabricante: "ZEBRA",
      numero_serie: "SERIE-1",
    });
  });

  it("não permite que a revisão altere hash, corpo, status ou metadados do e-mail", () => {
    const original = importacao();
    const revisado = aplicarRevisaoImportacao(original, {
      hash_email: "b".repeat(64), corpo_email: "substituído", status: "Concluído",
      remetente: "outro@example.invalid", cliente: "Claro",
    });

    expect(revisado).toMatchObject({
      hash_email: original.hash_email,
      corpo_email: original.corpo_email,
      status: "Agendado",
      remetente: original.remetente,
      cliente: "Claro",
    });
  });

  it.each(["MI-123", "MI-123-2", "SR-900001", "INC-924376", ""])("aceita número válido %s", (numero) => {
    expect(() => validarRevisaoImportacao(importacao(), { numero_chamado: numero })).not.toThrow();
  });

  it("rejeita número e UF fora do formato sem enfraquecer a revisão", () => {
    expect(() => validarRevisaoImportacao(importacao(), { numero_chamado: "chamado 1" }))
      .toThrow("Número do chamado inválido");
    expect(() => validarRevisaoImportacao(importacao(), { estado: "Paraná" }))
      .toThrow("UF inválida");
    expect(() => validarRevisaoImportacao(importacao(), { numero_chamado: "INC-924376-2" }))
      .toThrow("Número do chamado inválido");
  });

  it.each([
    ["valor_base", "0"],
    ["valor_base", "100.50"],
    ["horas_incluidas", "0"],
    ["horas_incluidas", "3.5"],
    ["valor_hora_adicional", "30"],
  ] as const)("aceita %s numérico e não negativo", (campo, valor) => {
    expect(validarRevisaoImportacao(importacao(), { [campo]: valor })[campo]).toBe(valor);
  });

  it.each([
    ["valor_base", "-1"],
    ["horas_incluidas", "NaN"],
    ["valor_hora_adicional", "Infinity"],
    ["valor_base", "0x10"],
    ["horas_incluidas", " 3 "],
  ] as const)("rejeita %s inválido (%s)", (campo, valor) => {
    expect(() => validarRevisaoImportacao(importacao(), { [campo]: valor }))
      .toThrow(`Valor inválido no campo ${campo}.`);
  });

  it("rejeita payload de tipo arbitrário mesmo em campo editável", () => {
    expect(() => aplicarRevisaoImportacao(importacao(), { valor_base: { valor: 100 } }))
      .toThrow("Valor inválido no campo valor_base.");
  });
});
