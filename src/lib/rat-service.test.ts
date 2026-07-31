import { describe, expect, it } from "vitest";

import { RatService, type RatGateway, type RatStorage } from "@/lib/rat-service";
import type { RatRegistro, RatRevisao } from "@/lib/rat-types";
import type { Chamado } from "@/lib/types";

const revisao = {
  chamado: "MI-1", data_inicio: "", hora_inicio: "", data_fim: "", hora_fim: "", login: "", colaborador: "", telefone: "", email: "", localidade: "",
  tipos_ocorrencia: [], tipo_equipamento: "", outro_equipamento: "", dominio: "", atual_serial: "", atual_ae: "", atual_fabricante: "", atual_modelo: "",
  atual_processador: "", atual_hd: "", atual_hostname: "", atual_memoria: "", novo_serial: "", novo_ae: "", novo_fabricante: "", novo_modelo: "",
  novo_processador: "", novo_hd: "", novo_hostname: "", novo_memoria: "", pasta_perfil_pst: "", software: "", itens_afetados: [], memoria_frequencia: "",
  item_outros: "", part_number: "", centro_custo: "", diagnosticos: [], diagnostico_outros: "", descricao: "", status_equipamento: [], condicao_equipamento: "", qualificacao: "", validacoes_finais: [],
  recebido_laboratorio: false, recebido_estoque: false, analista_logistica: "", data_hora_logistica: "",
} satisfies RatRevisao;
const chamado = { id: 1, status: "Concluído" } as Chamado;

class Gateway implements RatGateway {
  registros: RatRegistro[] = [];
  falhar = false;
  async buscarChamado() { return chamado; }
  async buscarCliente() { return null; }
  async buscarTecnico() { return null; }
  async listar() { return this.registros; }
  async buscarRat(id: string, chamadoId: number) { return this.registros.find((r) => r.id === id && r.chamado_id === chamadoId) || null; }
  async registrar(entrada: Parameters<RatGateway["registrar"]>[0]) {
    if (this.falhar) throw new Error("Banco indisponível");
    this.registros.forEach((r) => { r.atual = false; r.status_rat = "Substituída"; });
    const registro = { ...entrada, versao: this.registros.length + 1, status_rat: "Gerada", atual: true } satisfies RatRegistro;
    this.registros.push(registro); return registro;
  }
}
class Storage implements RatStorage {
  enviados: string[] = []; removidos: string[] = [];
  async baixar() { return new Uint8Array([1]); }
  async enviar(caminho: string) { this.enviados.push(caminho); }
  async remover(caminho: string) { this.removidos.push(caminho); }
  async baixarPdf() { return new Uint8Array([7, 8, 9]); }
}

function service(status = "Concluído") {
  const gateway = new Gateway(); const storage = new Storage();
  gateway.buscarChamado = async () => ({ ...chamado, status });
  return { gateway, storage, service: new RatService(gateway, storage, async () => new Uint8Array([1, 2, 3]), () => "uuid-fixo", () => new Date("2026-07-31T15:00:00Z")) };
}

describe("RatService", () => {
  it.each(["Em atendimento", "Concluído", "Improdutivo"])("gera RAT para %s sem alterar status", async (status) => {
    const c = service(status); const rat = await c.service.gerarRat(1, revisao);
    expect(rat).toMatchObject({ versao: 1, atual: true }); expect((await c.gateway.buscarChamado(1))?.status).toBe(status);
  });
  it("exige confirmação para cancelado", async () => {
    const c = service("Cancelado"); await expect(c.service.gerarRat(1, revisao)).rejects.toThrow("Confirme");
    await expect(c.service.gerarRat(1, revisao, true)).resolves.toMatchObject({ versao: 1 });
  });
  it("preserva versões anteriores e marca somente a nova como atual", async () => {
    const c = service(); await c.service.gerarRat(1, revisao); await c.service.gerarRat(1, revisao);
    expect(c.gateway.registros.map((r) => [r.versao, r.atual])).toEqual([[1, false], [2, true]]);
  });
  it("remove o PDF novo quando a persistência falha", async () => {
    const c = service(); c.gateway.falhar = true; await expect(c.service.gerarRat(1, revisao)).rejects.toThrow("Banco indisponível");
    expect(c.storage.removidos).toEqual(["1/uuid-fixo.pdf"]);
  });
  it("só baixa RAT vinculada ao chamado", async () => {
    const c = service(); const rat = await c.service.gerarRat(1, revisao);
    await expect(c.service.baixar(2, rat.id)).rejects.toThrow("RAT não encontrada");
    expect((await c.service.baixar(1, rat.id)).bytes).toEqual(new Uint8Array([7, 8, 9]));
  });
});
