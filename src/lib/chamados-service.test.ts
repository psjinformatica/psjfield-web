import { describe, expect, it } from "vitest";

import { ChamadosService, type ChamadosGateway } from "@/lib/chamados-service";
import type { AtendimentoInput, Chamado, ChamadoImportacao, ChamadoResumo } from "@/lib/types";

function importacao(hash = "hash-1"): ChamadoImportacao {
  return {
    numero_chamado: "MI-100",
    empresa_parceira: "Grupo Easy",
    cliente: "Claro",
    projeto: "Projeto",
    assunto_email: "Chamado MI-100",
    remetente: "origem@example.invalid",
    destinatario: "destino@example.invalid",
    data_email: "",
    data_agendada: "2026-08-01",
    hora_agendada: "09:00",
    usuario_responsavel: "",
    contato: "",
    telefone: "",
    endereco: "",
    cidade: "",
    estado: "",
    atividade: "",
    descricao: "",
    equipamento: "",
    fabricante: "",
    modelo: "",
    patrimonio_ae: "",
    numero_serie: "",
    valor_base: null,
    horas_incluidas: null,
    valor_hora_adicional: null,
    status: "Agendado",
    observacoes: "",
    caminho_email: "",
    hash_email: hash,
    corpo_email: "teste",
    criado_em: "2026-07-30T10:00:00Z",
    atualizado_em: "2026-07-30T10:00:00Z",
  };
}

class GatewayMemoria implements ChamadosGateway {
  registros = new Map<number, Chamado>();
  hashes = new Map<string, number>();
  proximoId = 1;
  falhar = false;

  async listar(): Promise<ChamadoResumo[]> {
    if (this.falhar) throw new Error("Banco indisponível");
    return [...this.registros.values()];
  }
  async buscar(id: number) {
    if (this.falhar) throw new Error("Banco indisponível");
    return this.registros.get(id) || null;
  }
  async atualizar(id: number, dados: AtendimentoInput) {
    if (this.falhar) throw new Error("Banco indisponível");
    const atual = this.registros.get(id);
    if (!atual) throw new Error("Chamado não encontrado.");
    this.registros.set(id, { ...atual, ...dados });
  }
  async buscarHash(hash: string) {
    const chamado_id = this.hashes.get(hash);
    const chamado = chamado_id ? this.registros.get(chamado_id) : null;
    return chamado_id && chamado ? {
      chamado_id,
      numero_chamado: chamado.numero_chamado,
      cliente: chamado.cliente,
      cidade: chamado.cidade,
      estado: chamado.estado,
      importado_em: "2026-07-30T17:32:00.000Z",
    } : null;
  }
  async importar(chamado: ChamadoImportacao) {
    if (this.falhar) throw new Error("Banco indisponível");
    const id = this.proximoId++;
    this.hashes.set(chamado.hash_email, id);
    this.registros.set(id, {
      ...chamado,
      id,
      hora_chegada: "",
      hora_inicio: "",
      hora_termino: "",
      descricao_servico: "",
      observacoes_atendimento: "",
    });
    return id;
  }
  async excluir(id: number) {
    if (this.falhar) throw new Error("Banco indisponível");
    const registro = this.registros.get(id);
    if (!registro) throw new Error("Chamado não encontrado.");
    this.registros.delete(id);
    for (const [hash, chamadoId] of this.hashes) if (chamadoId === id) this.hashes.delete(hash);
  }
}

describe("ChamadosService", () => {
  it("lê a lista e o detalhe de chamados", async () => {
    const gateway = new GatewayMemoria();
    const service = new ChamadosService(gateway);
    const id = await service.importar(importacao(), "teste.eml");
    expect(await service.listar()).toHaveLength(1);
    expect((await service.buscar(id))?.numero_chamado).toBe("MI-100");
  });

  it("atualiza o atendimento e valida horários", async () => {
    const gateway = new GatewayMemoria();
    const service = new ChamadosService(gateway);
    const id = await service.importar(importacao(), "teste.eml");
    await service.atualizar(id, {
      hora_chegada: "08:50",
      hora_inicio: "09:00",
      hora_termino: "10:10",
      descricao_servico: "Concluído",
      observacoes_atendimento: "",
    });
    expect((await service.buscar(id))?.hora_termino).toBe("10:10");
    await expect(service.atualizar(id, {
      hora_chegada: "25:00",
      hora_inicio: "",
      hora_termino: "",
      descricao_servico: "",
      observacoes_atendimento: "",
    })).rejects.toThrow("HH:MM");
  });

  it("impede duplicidade, exclui e permite reimportação", async () => {
    const gateway = new GatewayMemoria();
    const service = new ChamadosService(gateway);
    const chamado = importacao();
    const id = await service.importar(chamado, "teste.eml");
    expect(await service.buscarHash(chamado.hash_email)).toMatchObject({
      chamado_id: id,
      numero_chamado: "MI-100",
      cliente: "Claro",
    });
    await expect(service.importar(chamado, "copia.eml")).rejects.toThrow("já foi importado");
    await service.excluir(id);
    expect(await service.buscar(id)).toBeNull();
    await expect(service.importar(chamado, "reimportado.eml")).resolves.toBe(2);
  });

  it("propaga erro de banco sem inventar fallback", async () => {
    const gateway = new GatewayMemoria();
    gateway.falhar = true;
    const service = new ChamadosService(gateway);
    await expect(service.listar()).rejects.toThrow("Banco indisponível");
    await expect(service.importar(importacao(), "teste.eml")).rejects.toThrow("Banco indisponível");
  });
});
