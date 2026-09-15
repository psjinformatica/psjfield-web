import { describe, expect, it, vi } from "vitest";

import { criarHandlersRat } from "@/lib/rat-handlers";
import type { RatRevisao } from "@/lib/rat-types";
import { criarRatDasaValida } from "@/test/fixtures/rat-dasa";

const revisaoClaro = {
  chamado: "MI-1", data_inicio: "", hora_inicio: "", data_fim: "", hora_fim: "", login: "", colaborador: "", telefone: "", email: "", localidade: "",
  tipos_ocorrencia: [], tipo_equipamento: "", outro_equipamento: "", dominio: "", atual_serial: "", atual_ae: "", atual_fabricante: "", atual_modelo: "",
  atual_processador: "", atual_hd: "", atual_hostname: "", atual_memoria: "", novo_serial: "", novo_ae: "", novo_fabricante: "", novo_modelo: "",
  novo_processador: "", novo_hd: "", novo_hostname: "", novo_memoria: "", pasta_perfil_pst: "", software: "", itens_afetados: [], memoria_frequencia: "",
  item_outros: "", part_number: "", centro_custo: "", diagnosticos: [], diagnostico_outros: "", descricao: "", status_equipamento: [], condicao_equipamento: "", qualificacao: "", validacoes_finais: [],
  recebido_laboratorio: false, recebido_estoque: false, analista_logistica: "", data_hora_logistica: "",
} satisfies RatRevisao;

const contexto = {
  cliente: null,
  tecnico: null,
  geradoEm: "2026-09-15T15:40:00.000Z",
  carregarAssinatura: vi.fn(),
};

describe("handlers de modelos RAT", () => {
  it("registra o SHA-256 real e estável do template Claro protegido", async () => {
    const handlers = criarHandlersRat({ gerarClaro: async () => new Uint8Array([1]) });
    const resultado = await handlers["claro-v1"].preparar({ ...contexto, entrada: revisaoClaro });
    expect(resultado.templateHash).toBe("1cb582e940b46a0f956d7badba83fdcb0148aacbac5038ad641f0fbc5cbc87d2");
    expect(resultado.identidade).toEqual({ modelo_rat: "claro", modelo_versao: 1, schema_versao: 1 });
  });

  it("registra o SHA-256 real do template DASA e aceita assinaturas ausentes", async () => {
    const dados = criarRatDasaValida();
    dados.cliente.assinatura_cliente = null;
    dados.tecnico.assinatura_tecnico = null;
    const handlers = criarHandlersRat({ gerarDasa: async () => new Uint8Array([2]) });
    const resultado = await handlers["dasa-v1"].preparar({ ...contexto, entrada: dados });
    expect(resultado.templateHash).toBe("b9fd3aed5fc73b0b3f03160c1156cb832e59d5904bd10bdeb8e9df99076f74d4");
    expect(resultado.identidade).toEqual({ modelo_rat: "dasa", modelo_versao: 1, schema_versao: 1 });
    expect(resultado.assinaturasSnapshot).toEqual({});
  });

  it("compara em ISO datas Date vindas do repository para ambas as assinaturas DASA", async () => {
    const dados = criarRatDasaValida();
    const carregarAssinatura = vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3]));
    const handlers = criarHandlersRat({ gerarDasa: async () => new Uint8Array([2]) });
    const resultado = await handlers["dasa-v1"].preparar({
      ...contexto,
      entrada: dados,
      cliente: {
        chamado_id: 20,
        nome_responsavel: dados.cliente.nome_colaborador_acompanhante,
        documento_responsavel: "",
        caminho_assinatura: dados.cliente.assinatura_cliente!.caminho,
        assinado_em: new Date(dados.cliente.assinatura_cliente!.registrada_em) as unknown as string,
        atualizado_em: new Date(dados.cliente.assinatura_cliente!.registrada_em) as unknown as string,
      },
      tecnico: {
        id: 1,
        nome_tecnico: dados.tecnico.nome_tecnico,
        caminho_assinatura: dados.tecnico.assinatura_tecnico!.caminho,
        atualizado_em: new Date(dados.tecnico.assinatura_tecnico!.registrada_em) as unknown as string,
      },
      carregarAssinatura,
    });

    expect(carregarAssinatura).toHaveBeenCalledTimes(2);
    expect(resultado.assinaturasSnapshot.cliente?.registrada_em).toBe("2026-09-15T15:40:00.000Z");
    expect(resultado.assinaturasSnapshot.tecnico?.registrada_em).toBe("2026-09-15T15:40:00.000Z");
  });
});
