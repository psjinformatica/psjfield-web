import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

import {
  CAMPOS_PREVIEW_IMPORTACAO,
  aplicarRevisaoImportacao,
} from "@/lib/importacao-campos";
import { interpretarEml } from "@/lib/parser";
import { mapChamadoParaRatDasa } from "@/lib/rat-dasa-mapper";
import type { Chamado } from "@/lib/types";

function emlDasa(corpo: string) {
  return new TextEncoder().encode(
    "From: Grupo Easy <operacoes@grupoeasy.example>\r\n" +
    "To: tecnico@example.invalid\r\n" +
    "Subject: Atendimento DASA SR-900001\r\n" +
    "Date: Mon, 28 Sep 2026 10:00:00 -0300\r\n" +
    `Content-Type: text/plain; charset=utf-8\r\n\r\n${corpo}`,
  );
}

function comoChamado(importado: Awaited<ReturnType<typeof interpretarEml>>["chamado"]): Chamado {
  return {
    ...importado,
    id: 900001,
    visita_numero: 1,
    chamado_raiz_id: null,
    hora_chegada: "",
    hora_inicio: "",
    hora_termino: "",
    descricao_servico: "",
    observacoes_atendimento: "",
  };
}

describe("fluxo DASA de unidade e equipamento", () => {
  it("transporta unidade revisada do e-mail até o mapper sem confundi-la com equipamento", async () => {
    const previa = await interpretarEml(emlDasa([
      "CLIENTE: DASA",
      "CHAMADO INTERNO: SR-900001",
      "NOME DA UNIDADE: Unidade DASA Original",
      "EQUIPAMENTO: Etiquetadora",
      "ENDEREÇO DE ATENDIMENTO: Rua Exemplo, 100 - Curitiba - PR",
      "DEFEITO OU SOLICITAÇÃO: Falha informada",
      "NOME DO SOLICITANTE: Solicitante Exemplo",
      "TELEFONE:",
      "TELEFONE DO SUPORTE: (00) 0000-0000",
    ].join("\r\n")), "dasa.eml");

    expect(CAMPOS_PREVIEW_IMPORTACAO).toContainEqual(["unidade_nome", "Unidade/Nome"]);
    expect(previa.chamado).toMatchObject({
      unidade_nome: "Unidade DASA Original",
      equipamento: "Etiquetadora",
      telefone: "",
    });

    const revisado = aplicarRevisaoImportacao(previa.chamado, {
      unidade_nome: "Unidade DASA Revisada",
      equipamento: "Etiquetadora",
    });
    const rat = mapChamadoParaRatDasa(comoChamado(revisado));

    expect(revisado.unidade_nome).toBe("Unidade DASA Revisada");
    expect(rat.local).toMatchObject({
      unidade_nome: "Unidade DASA Revisada",
      unidade_nome_origem: "INFORMADO",
      telefone: "",
    });
    expect(rat.equipamento.tipo).toBe("Etiquetadora");
  });

  it("mantém unidade ausente vazia e não classifica equipamento ambíguo", async () => {
    const previa = await interpretarEml(emlDasa([
      "CLIENTE: DASA",
      "CHAMADO INTERNO: SR-900001",
      "EQUIPAMENTO: DG24 | FEF - FR IMMEF",
    ].join("\r\n")), "dasa-sem-unidade.eml");
    const rat = mapChamadoParaRatDasa(comoChamado(previa.chamado));

    expect(rat.local.unidade_nome).toBe("");
    expect(rat.local.unidade_nome_origem).toBe("NAO_IDENTIFICADA");
    expect(rat.equipamento.tipo).toBe("");
  });

  it("inclui unidade no INSERT e na leitura do chamado sem afetar a listagem", async () => {
    const fonte = await readFile(new URL("./repository.ts", import.meta.url), "utf8");
    const busca = fonte.slice(
      fonte.indexOf("export async function buscarChamado"),
      fonte.indexOf("export async function marcarChamadoVisualizado"),
    );
    const importacao = fonte.slice(
      fonte.indexOf("const colunasImportacao"),
      fonte.indexOf("export async function excluirChamado"),
    );

    expect(busca).toContain("contato, telefone, unidade_nome, endereco");
    expect(importacao).toContain('"contato", "telefone", "unidade_nome", "endereco"');
  });
});
