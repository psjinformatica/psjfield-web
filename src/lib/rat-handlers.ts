import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

import type { AssinaturaCliente, AssinaturaTecnico } from "@/lib/assinaturas-types";
import { CAMINHO_TEMPLATE_RAT_DASA, gerarRatDasaPdf } from "@/lib/rat-dasa-pdf";
import type { RatDasaSnapshotV1 } from "@/lib/rat-dasa-types";
import { validarRatDasaV1ParaGeracao } from "@/lib/rat-dasa-validation";
import type { ModeloRat } from "@/lib/rat-models";
import { CAMINHO_TEMPLATE_RAT_CLARO, gerarRatPdf } from "@/lib/rat-pdf";
import type {
  RatAssinaturas,
  RatAssinaturasSnapshot,
  RatDadosRevisao,
} from "@/lib/rat-types";
import { validarRatRevisao } from "@/lib/rat-validation";
import { identidadeModeloRat, type IdentidadeModeloRat } from "@/lib/rat-versioning";

type CarregarAssinatura = (bucket: string, caminho: string) => Promise<Uint8Array>;

export type ContextoHandlerRat = {
  entrada: unknown;
  cliente: AssinaturaCliente | null;
  tecnico: AssinaturaTecnico | null;
  geradoEm: string;
  carregarAssinatura: CarregarAssinatura;
};

export type ResultadoHandlerRat = {
  bytes: Uint8Array;
  dadosRevisao: RatDadosRevisao;
  tecnico: string;
  identidade: IdentidadeModeloRat;
  templateHash: string;
  assinaturasSnapshot: RatAssinaturasSnapshot;
};

export type RatHandler = {
  modelo: ModeloRat;
  preparar(contexto: ContextoHandlerRat): Promise<ResultadoHandlerRat>;
};

export type DependenciasHandlersRat = {
  gerarClaro?: typeof gerarRatPdf;
  gerarDasa?: typeof gerarRatDasaPdf;
  hashTemplate?: (caminho: string) => Promise<string>;
};

async function sha256Arquivo(caminho: string) {
  return createHash("sha256").update(await readFile(caminho)).digest("hex");
}

function snapshotAssinatura(nome: string, caminho: string, registradaEm: string, bytes: Uint8Array) {
  return {
    bucket: "assinaturas" as const,
    caminho,
    nome,
    sha256: createHash("sha256").update(bytes).digest("hex"),
    registrada_em: registradaEm,
  };
}

export function criarHandlersRat(dependencias: DependenciasHandlersRat = {}): Record<ModeloRat, RatHandler> {
  const gerarClaro = dependencias.gerarClaro ?? gerarRatPdf;
  const gerarDasa = dependencias.gerarDasa ?? gerarRatDasaPdf;
  const hashTemplate = dependencias.hashTemplate ?? sha256Arquivo;

  const claro: RatHandler = {
    modelo: "claro-v1",
    async preparar({ entrada, cliente, tecnico, geradoEm, carregarAssinatura }) {
      const dados = validarRatRevisao(entrada);
      const [clienteBytes, tecnicoBytes] = await Promise.all([
        cliente ? carregarAssinatura("assinaturas", cliente.caminho_assinatura) : undefined,
        tecnico ? carregarAssinatura("assinaturas", tecnico.caminho_assinatura) : undefined,
      ]);
      const assinaturas: RatAssinaturas = {
        gerado_em: geradoEm,
        cliente: cliente && clienteBytes ? {
          nome: cliente.nome_responsavel,
          documento: cliente.documento_responsavel,
          assinado_em: cliente.assinado_em,
          bytes: clienteBytes,
        } : undefined,
        tecnico: tecnico && tecnicoBytes ? {
          nome: tecnico.nome_tecnico,
          assinado_em: geradoEm,
          bytes: tecnicoBytes,
        } : undefined,
      };
      const assinaturasSnapshot: RatAssinaturasSnapshot = {};
      if (cliente && clienteBytes) assinaturasSnapshot.cliente = snapshotAssinatura(
        cliente.nome_responsavel, cliente.caminho_assinatura, cliente.assinado_em, clienteBytes,
      );
      if (tecnico && tecnicoBytes) assinaturasSnapshot.tecnico = snapshotAssinatura(
        tecnico.nome_tecnico, tecnico.caminho_assinatura, tecnico.atualizado_em, tecnicoBytes,
      );
      return {
        bytes: await gerarClaro(dados, assinaturas),
        dadosRevisao: dados,
        tecnico: tecnico?.nome_tecnico || "",
        identidade: identidadeModeloRat("claro-v1"),
        templateHash: await hashTemplate(CAMINHO_TEMPLATE_RAT_CLARO),
        assinaturasSnapshot,
      };
    },
  };

  const dasa: RatHandler = {
    modelo: "dasa-v1",
    async preparar({ entrada, cliente, tecnico, carregarAssinatura }) {
      const dados = validarRatDasaV1ParaGeracao(entrada);
      const referenciaCliente = dados.cliente.assinatura_cliente;
      const referenciaTecnico = dados.tecnico.assinatura_tecnico;
      if (referenciaCliente && (
        !cliente
        || cliente.caminho_assinatura !== referenciaCliente.caminho
        || cliente.assinado_em !== referenciaCliente.registrada_em
        || cliente.nome_responsavel.trim() !== dados.cliente.nome_colaborador_acompanhante.trim()
      )) {
        throw new Error("A referência da assinatura do colaborador não corresponde ao chamado.");
      }
      if (referenciaTecnico && (
        !tecnico
        || tecnico.caminho_assinatura !== referenciaTecnico.caminho
        || tecnico.atualizado_em !== referenciaTecnico.registrada_em
        || tecnico.nome_tecnico.trim() !== dados.tecnico.nome_tecnico.trim()
      )) {
        throw new Error("A referência da assinatura do técnico não corresponde à configuração atual.");
      }
      const [clienteBytes, tecnicoBytes] = await Promise.all([
        referenciaCliente ? carregarAssinatura("assinaturas", referenciaCliente.caminho) : undefined,
        referenciaTecnico ? carregarAssinatura("assinaturas", referenciaTecnico.caminho) : undefined,
      ]);
      const assinaturasSnapshot: RatAssinaturasSnapshot = {};
      if (referenciaCliente && clienteBytes) assinaturasSnapshot.cliente = snapshotAssinatura(
        dados.cliente.nome_colaborador_acompanhante,
        referenciaCliente.caminho,
        referenciaCliente.registrada_em,
        clienteBytes,
      );
      if (referenciaTecnico && tecnicoBytes) assinaturasSnapshot.tecnico = snapshotAssinatura(
        dados.tecnico.nome_tecnico,
        referenciaTecnico.caminho,
        referenciaTecnico.registrada_em,
        tecnicoBytes,
      );
      return {
        bytes: await gerarDasa(dados, { cliente: clienteBytes, tecnico: tecnicoBytes }),
        dadosRevisao: dados as RatDasaSnapshotV1,
        tecnico: dados.tecnico.nome_tecnico,
        identidade: identidadeModeloRat("dasa-v1"),
        templateHash: await hashTemplate(CAMINHO_TEMPLATE_RAT_DASA),
        assinaturasSnapshot,
      };
    },
  };

  return { "claro-v1": claro, "dasa-v1": dasa };
}
