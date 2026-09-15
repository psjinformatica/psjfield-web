import { describe, expect, it } from "vitest";

import type { RatRegistro, RatRevisao } from "@/lib/rat-types";
import {
  identidadeRegistroRat,
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
});
