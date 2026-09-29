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

export function mesclarRevisaoDasaComCadastroAtual(
  cadastro: RatDasaSnapshotV1,
  revisao: RatDasaSnapshotV1,
): RatDasaSnapshotV1 {
  return {
    ...revisao,
    local: {
      ...revisao.local,
      unidade_nome: cadastro.local.unidade_nome,
      unidade_nome_origem: cadastro.local.unidade_nome_origem,
      solicitante: cadastro.local.solicitante,
      endereco: cadastro.local.endereco,
      cidade: cadastro.local.cidade,
      estado: cadastro.local.estado,
      telefone: cadastro.local.telefone,
    },
    equipamento: {
      ...revisao.equipamento,
      chamado_moebius: cadastro.equipamento.chamado_moebius,
      patrimonio: cadastro.equipamento.patrimonio,
      service_tag_serial: cadastro.equipamento.service_tag_serial,
      marca: cadastro.equipamento.marca,
      modelo: cadastro.equipamento.modelo,
      tipo: cadastro.equipamento.tipo || revisao.equipamento.tipo,
    },
    atendimento: {
      ...revisao.atendimento,
      defeito_informado: cadastro.atendimento.defeito_informado,
    },
  };
}

export function mesclarRevisaoClaroComCadastroAtual(
  cadastro: RatRevisao,
  revisao: RatRevisao,
): RatRevisao {
  return {
    ...cadastro,
    ...revisao,
    chamado: cadastro.chamado,
    login: cadastro.login,
    telefone: cadastro.telefone,
    localidade: cadastro.localidade,
    tipo_equipamento: cadastro.tipo_equipamento,
    outro_equipamento: cadastro.outro_equipamento,
    atual_serial: cadastro.atual_serial,
    atual_ae: cadastro.atual_ae,
    atual_fabricante: cadastro.atual_fabricante,
    atual_modelo: cadastro.atual_modelo,
  };
}
