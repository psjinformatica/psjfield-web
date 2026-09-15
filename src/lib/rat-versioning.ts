import type { RatDasaSnapshotV1 } from "@/lib/rat-dasa-types";
import type { ModeloRat } from "@/lib/rat-models";
import type { RatModeloPersistido, RatRegistro, RatRevisao } from "@/lib/rat-types";

export type IdentidadeModeloRat = {
  modelo_rat: RatModeloPersistido;
  modelo_versao: 1;
  schema_versao: 1;
};

export const IDENTIDADE_RAT_CLARO_V1: IdentidadeModeloRat = {
  modelo_rat: "claro",
  modelo_versao: 1,
  schema_versao: 1,
};

export const IDENTIDADE_RAT_DASA_V1: IdentidadeModeloRat = {
  modelo_rat: "dasa",
  modelo_versao: 1,
  schema_versao: 1,
};

export function identidadeModeloRat(modelo: ModeloRat) {
  return modelo === "dasa-v1" ? IDENTIDADE_RAT_DASA_V1 : IDENTIDADE_RAT_CLARO_V1;
}

export function identidadeRegistroRat(registro: Pick<RatRegistro, "modelo_rat" | "modelo_versao" | "schema_versao">) {
  return {
    modelo_rat: registro.modelo_rat ?? "claro",
    modelo_versao: registro.modelo_versao ?? 1,
    schema_versao: registro.schema_versao ?? 1,
  };
}

export function ratCompativelComModelo(registro: RatRegistro, modelo: ModeloRat) {
  const esperado = identidadeModeloRat(modelo);
  const encontrado = identidadeRegistroRat(registro);
  return encontrado.modelo_rat === esperado.modelo_rat
    && encontrado.modelo_versao === esperado.modelo_versao
    && encontrado.schema_versao === esperado.schema_versao;
}

export function ultimaRevisaoClaroCompativel(registros: RatRegistro[]): RatRevisao | null {
  const registro = registros.find((item) => ratCompativelComModelo(item, "claro-v1"));
  return registro ? registro.dados_revisao as RatRevisao : null;
}

export function ultimaRevisaoDasaCompativel(registros: RatRegistro[]): RatDasaSnapshotV1 | null {
  const registro = registros.find((item) => ratCompativelComModelo(item, "dasa-v1"));
  return registro ? registro.dados_revisao as RatDasaSnapshotV1 : null;
}
