import { createHash } from "node:crypto";

import { describe, expect, it, vi } from "vitest";

import type { AssinaturaCliente, AssinaturaTecnico } from "@/lib/assinaturas-types";
import { criarHandlersRat } from "@/lib/rat-handlers";
import { RatService, type RatGateway, type RatStorage } from "@/lib/rat-service";
import type { RatRegistro, RatRevisao } from "@/lib/rat-types";
import type { Chamado } from "@/lib/types";
import { chamadoDasaSeguro, criarRatDasaValida, tecnicoDasaSeguro } from "@/test/fixtures/rat-dasa";

const revisaoClaro = {
  chamado: "MI-1", data_inicio: "", hora_inicio: "", data_fim: "", hora_fim: "", login: "", colaborador: "", telefone: "", email: "", localidade: "",
  tipos_ocorrencia: [], tipo_equipamento: "", outro_equipamento: "", dominio: "", atual_serial: "", atual_ae: "", atual_fabricante: "", atual_modelo: "",
  atual_processador: "", atual_hd: "", atual_hostname: "", atual_memoria: "", novo_serial: "", novo_ae: "", novo_fabricante: "", novo_modelo: "",
  novo_processador: "", novo_hd: "", novo_hostname: "", novo_memoria: "", pasta_perfil_pst: "", software: "", itens_afetados: [], memoria_frequencia: "",
  item_outros: "", part_number: "", centro_custo: "", diagnosticos: [], diagnostico_outros: "", descricao: "", status_equipamento: [], condicao_equipamento: "", qualificacao: "", validacoes_finais: [],
  recebido_laboratorio: false, recebido_estoque: false, analista_logistica: "", data_hora_logistica: "",
} satisfies RatRevisao;

class Gateway implements RatGateway {
  registros: RatRegistro[] = [];
  chamado: Chamado = { ...chamadoDasaSeguro, id: 1, numero_chamado: "MI-1", cliente: "Claro", status: "Concluído" };
  cliente: AssinaturaCliente | null = null;
  tecnico: AssinaturaTecnico | null = null;
  falhar = false;
  async buscarChamado() { return this.chamado; }
  async buscarCliente() { return this.cliente; }
  async buscarTecnico() { return this.tecnico; }
  async listar() { return this.registros; }
  async buscarRat(id: string, chamadoId: number) { return this.registros.find((r) => r.id === id && r.chamado_id === chamadoId) || null; }
  async registrar(entrada: Parameters<RatGateway["registrar"]>[0]) {
    if (this.falhar) throw new Error("Banco indisponível");
    this.registros.forEach((registro) => { registro.atual = false; registro.status_rat = "Substituída"; });
    const registro: RatRegistro = { ...entrada, versao: this.registros.length + 1, status_rat: "Gerada", atual: true };
    this.registros.push(registro);
    return registro;
  }
}

class Storage implements RatStorage {
  enviados: string[] = [];
  removidos: string[] = [];
  baixados: Array<[string, string]> = [];
  arquivos = new Map<string, Uint8Array>();
  falharEnvio = false;
  async baixar(bucket: string, caminho: string) { this.baixados.push([bucket, caminho]); return new Uint8Array([bucket === "assinaturas" ? 1 : 2]); }
  async enviar(caminho: string, bytes: Uint8Array) {
    if (this.falharEnvio) throw new Error("Storage indisponível");
    this.enviados.push(caminho); this.arquivos.set(caminho, bytes);
  }
  async remover(caminho: string) { this.removidos.push(caminho); }
  async baixarPdf() { return new Uint8Array([7, 8, 9]); }
}

function criarCenario({ dasa = false, permitirDasa = false } = {}) {
  const gateway = new Gateway(); const storage = new Storage();
  if (dasa) gateway.chamado = { ...chamadoDasaSeguro };
  let sequencia = 0;
  const gerarClaro = vi.fn(async () => new Uint8Array([1, 2, 3]));
  const gerarDasa = vi.fn(async () => new Uint8Array([4, 5, 6]));
  const handlers = criarHandlersRat({
    gerarClaro,
    gerarDasa,
    hashTemplate: async (caminho) => caminho.includes("DASA") ? "d".repeat(64) : "c".repeat(64),
  });
  const service = new RatService(gateway, storage, {
    handlers, permitirDasa, uuid: () => `uuid-${++sequencia}`,
    agora: () => new Date("2026-09-15T15:40:00.000Z"),
  });
  return { gateway, storage, service, gerarClaro, gerarDasa };
}

describe("RatService", () => {
  it.each(["Em atendimento", "Concluído", "Improdutivo"])("mantém a geração Claro para %s", async (status) => {
    const cenario = criarCenario(); cenario.gateway.chamado.status = status;
    const rat = await cenario.service.gerarRat(1, revisaoClaro);
    expect(rat).toMatchObject({ versao: 1, atual: true, modelo_rat: "claro", modelo_versao: 1, schema_versao: 1 });
    expect(cenario.gerarClaro).toHaveBeenCalledOnce(); expect(cenario.gerarDasa).not.toHaveBeenCalled();
  });

  it("preserva a confirmação excepcional para chamado cancelado", async () => {
    const cenario = criarCenario(); cenario.gateway.chamado.status = "Cancelado";
    await expect(cenario.service.gerarRat(1, revisaoClaro)).rejects.toThrow("Confirme");
    await expect(cenario.service.gerarRat(1, revisaoClaro, true)).resolves.toMatchObject({ versao: 1 });
  });

  it("preserva PDFs e snapshots Claro anteriores ao gerar nova versão", async () => {
    const cenario = criarCenario();
    await cenario.service.gerarRat(1, { ...revisaoClaro, descricao: "primeira" });
    await cenario.service.gerarRat(1, { ...revisaoClaro, descricao: "segunda" });
    expect(cenario.gateway.registros.map((registro) => [registro.versao, registro.atual])).toEqual([[1, false], [2, true]]);
    expect((cenario.gateway.registros[0].dados_revisao as RatRevisao).descricao).toBe("primeira");
    expect(cenario.storage.enviados).toEqual(["1/uuid-1.pdf", "1/uuid-2.pdf"]);
  });

  it("mantém assinaturas e gerador Claro com o comportamento atual", async () => {
    const cenario = criarCenario();
    cenario.gateway.cliente = { chamado_id: 1, nome_responsavel: "Cliente", documento_responsavel: "123", caminho_assinatura: "clientes/1.png", assinado_em: "2026-09-15T14:00:00Z", atualizado_em: "2026-09-15T14:00:00Z" };
    cenario.gateway.tecnico = { ...tecnicoDasaSeguro };
    const rat = await cenario.service.gerarRat(1, revisaoClaro);
    expect(cenario.storage.baixados).toEqual([["assinaturas", "clientes/1.png"], ["assinaturas", tecnicoDasaSeguro.caminho_assinatura]]);
    expect(cenario.gerarClaro).toHaveBeenCalledWith(revisaoClaro, expect.objectContaining({ cliente: expect.objectContaining({ nome: "Cliente", bytes: new Uint8Array([1]) }), tecnico: expect.objectContaining({ nome: "Técnico Exemplo", bytes: new Uint8Array([1]) }) }));
    expect(rat.assinaturas_snapshot).toEqual(expect.objectContaining({ cliente: expect.objectContaining({ sha256: expect.stringMatching(/^[0-9a-f]{64}$/) }), tecnico: expect.objectContaining({ sha256: expect.stringMatching(/^[0-9a-f]{64}$/) }) }));
  });

  it("bloqueia DASA sem autorização explícita antes de PDF, Storage ou banco", async () => {
    const cenario = criarCenario({ dasa: true });
    await expect(cenario.service.gerarRat(20, criarRatDasaValida())).rejects.toThrow("desabilitada neste ambiente");
    expect(cenario.gerarDasa).not.toHaveBeenCalled(); expect(cenario.storage.enviados).toEqual([]); expect(cenario.gateway.registros).toEqual([]);
  });

  it("permite Agendado somente para DASA autorizado sem alterar o chamado", async () => {
    const dasa = criarCenario({ dasa: true, permitirDasa: true });
    dasa.gateway.chamado.status = "Agendado";
    const dados = criarRatDasaValida(); dados.cliente.assinatura_cliente = null; dados.tecnico.assinatura_tecnico = null;
    await expect(dasa.service.gerarRat(20, dados)).resolves.toMatchObject({ versao: 1, modelo_rat: "dasa" });
    expect(dasa.gateway.chamado.status).toBe("Agendado");

    const claro = criarCenario(); claro.gateway.chamado.status = "Agendado";
    await expect(claro.service.gerarRat(1, revisaoClaro)).rejects.toThrow("em atendimento ou finalizados");
  });

  it("consulta chamado, assinatura do cliente e técnico em sequência", async () => {
    const cenario = criarCenario({ dasa: true, permitirDasa: true });
    const ordem: string[] = [];
    cenario.gateway.buscarChamado = vi.fn(async () => { ordem.push("chamado"); return cenario.gateway.chamado; });
    cenario.gateway.buscarCliente = vi.fn(async () => { ordem.push("cliente"); return null; });
    cenario.gateway.buscarTecnico = vi.fn(async () => { ordem.push("tecnico"); return null; });
    const dados = criarRatDasaValida(); dados.cliente.assinatura_cliente = null; dados.tecnico.assinatura_tecnico = null;
    await cenario.service.gerarRat(20, dados);
    expect(ordem).toEqual(["chamado", "cliente", "tecnico"]);
  });

  it("cria versões 1 e 2 DASA com identidade, hashes e arquivos independentes", async () => {
    const cenario = criarCenario({ dasa: true, permitirDasa: true });
    const primeira = criarRatDasaValida(); primeira.cliente.assinatura_cliente = null; primeira.tecnico.assinatura_tecnico = null;
    const segunda = structuredClone(primeira); segunda.atendimento.solucao_aplicada = "Solução revisada na segunda versão";
    const v1 = await cenario.service.gerarRat(20, primeira); const v2 = await cenario.service.gerarRat(20, segunda);
    expect(v1).toMatchObject({ versao: 1, atual: false, modelo_rat: "dasa", modelo_versao: 1, schema_versao: 1, template_hash: "d".repeat(64) });
    expect(v1.hash_pdf).toBe(createHash("sha256").update(new Uint8Array([4, 5, 6])).digest("hex"));
    expect(v2).toMatchObject({ versao: 2, atual: true, modelo_rat: "dasa", modelo_versao: 1, schema_versao: 1 });
    expect(cenario.storage.enviados).toEqual(["20/uuid-1.pdf", "20/uuid-2.pdf"]); expect(cenario.storage.arquivos.has("20/uuid-1.pdf")).toBe(true);
    expect(cenario.gerarClaro).not.toHaveBeenCalled(); expect(cenario.gerarDasa).toHaveBeenCalledTimes(2);
  });

  it("aceita DASA sem assinaturas e mantém snapshot integral e imutável", async () => {
    const cenario = criarCenario({ dasa: true, permitirDasa: true });
    const dados = criarRatDasaValida(); dados.cliente.assinatura_cliente = null; dados.tecnico.assinatura_tecnico = null;
    const rat = await cenario.service.gerarRat(20, dados); dados.atendimento.defeito_constatado = "alterado depois";
    expect(rat.assinaturas_snapshot).toEqual({}); expect(cenario.storage.baixados).toEqual([]);
    expect(rat.dados_revisao).toMatchObject({ modelo: "dasa-v1", schema_versao: 1, atendimento: { defeito_constatado: "Falha no circuito da operadora" } });
  });

  it("incorpora e audita somente referências DASA compatíveis", async () => {
    const cenario = criarCenario({ dasa: true, permitirDasa: true }); const dados = criarRatDasaValida();
    cenario.gateway.cliente = { chamado_id: 20, nome_responsavel: "Colaborador Exemplo", documento_responsavel: "", caminho_assinatura: dados.cliente.assinatura_cliente!.caminho, assinado_em: dados.cliente.assinatura_cliente!.registrada_em, atualizado_em: dados.cliente.assinatura_cliente!.registrada_em };
    cenario.gateway.tecnico = { ...tecnicoDasaSeguro };
    const rat = await cenario.service.gerarRat(20, dados);
    expect(cenario.gerarDasa).toHaveBeenCalledWith(dados, { cliente: new Uint8Array([1]), tecnico: new Uint8Array([1]) });
    expect(rat.assinaturas_snapshot).toEqual(expect.objectContaining({ cliente: expect.objectContaining({ nome: "Colaborador Exemplo", caminho: dados.cliente.assinatura_cliente!.caminho }), tecnico: expect.objectContaining({ nome: "Técnico Exemplo", caminho: tecnicoDasaSeguro.caminho_assinatura }) }));
  });

  it("não registra versão quando o upload falha", async () => {
    const cenario = criarCenario(); cenario.storage.falharEnvio = true;
    await expect(cenario.service.gerarRat(1, revisaoClaro)).rejects.toThrow("Storage indisponível"); expect(cenario.gateway.registros).toEqual([]);
  });

  it("remove apenas o PDF novo e preserva a versão anterior quando o banco falha", async () => {
    const cenario = criarCenario(); await cenario.service.gerarRat(1, revisaoClaro);
    const anterior = structuredClone(cenario.gateway.registros[0]); cenario.gateway.falhar = true;
    await expect(cenario.service.gerarRat(1, revisaoClaro)).rejects.toThrow("Banco indisponível");
    expect(cenario.storage.removidos).toEqual(["1/uuid-2.pdf"]); expect(cenario.gateway.registros).toEqual([anterior]); expect(cenario.gateway.registros[0].atual).toBe(true);
  });

  it("só baixa RAT vinculada ao chamado", async () => {
    const cenario = criarCenario(); const rat = await cenario.service.gerarRat(1, revisaoClaro);
    await expect(cenario.service.baixar(2, rat.id)).rejects.toThrow("RAT não encontrada"); expect((await cenario.service.baixar(1, rat.id)).bytes).toEqual(new Uint8Array([7, 8, 9]));
  });
});
