import { describe, expect, it } from "vitest";

import { ChamadosService, type ChamadosGateway } from "@/lib/chamados-service";
import { statusEncerraAtendimento, statusGeraRecebimento } from "@/lib/status";
import type {
  AtendimentoInput,
  Chamado,
  ChamadoImportacao,
  ChamadoResumo,
  FinalizacaoInput,
  NovaVisitaInput,
  ReaberturaInput,
} from "@/lib/types";

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
    unidade_nome: null,
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
  visualizacoes = new Map<number, string | null>();
  hashes = new Map<string, number>();
  proximoId = 1;
  falhar = false;
  reaberturas: Array<{ chamado_id: number; status_anterior: string; motivo: string }> = [];
  assinaturaCliente = "assinatura-preservada.png";
  ratAtual = { versao: 1, atual: true, caminho: "rat-v1.pdf" };

  async listar(): Promise<ChamadoResumo[]> {
    if (this.falhar) throw new Error("Banco indisponível");
    return [...this.registros.values()].map((registro) => ({
      ...registro,
      valor_financeiro: null,
      valor_card: registro.valor_base,
      pendencia_financeira: false,
      visualizado_em: this.visualizacoes.get(registro.id) ?? null,
    }));
  }
  async buscar(id: number) {
    if (this.falhar) throw new Error("Banco indisponível");
    return this.registros.get(id) || null;
  }
  async listarVisitas(id: number) {
    const fonte = this.registros.get(id);
    if (!fonte) return [];
    const raiz = fonte.chamado_raiz_id ?? fonte.id;
    return [...this.registros.values()]
      .filter((registro) => registro.id === raiz || registro.chamado_raiz_id === raiz)
      .sort((a, b) => a.visita_numero - b.visita_numero)
      .map((registro) => ({
        id: registro.id,
        visita_numero: registro.visita_numero,
        status: registro.status,
        data_agendada: registro.data_agendada,
        hora_agendada: registro.hora_agendada,
        unidade_nome: registro.unidade_nome,
        quantidade_rats: 0,
      }));
  }
  async marcarVisualizado(id: number) {
    if (this.falhar) throw new Error("Banco indisponível");
    const atual = this.registros.get(id);
    if (!atual) return false;
    if (this.visualizacoes.get(id)) return false;
    this.visualizacoes.set(id, "2026-09-15T22:00:00.000Z");
    return true;
  }
  async atualizar(id: number, dados: AtendimentoInput) {
    if (this.falhar) throw new Error("Banco indisponível");
    const atual = this.registros.get(id);
    if (!atual) throw new Error("Chamado não encontrado.");
    if (atual.hora_inicio && atual.hora_inicio !== dados.hora_inicio && !dados.confirmar_alteracao_hora_inicio) {
      throw new Error("Confirme a alteração do horário de início.");
    }
    const status = atual.status === "Agendado" && dados.hora_inicio ? "Em atendimento" : atual.status;
    this.registros.set(id, { ...atual, ...dados, status });
    return { status, hora_inicio: dados.hora_inicio };
  }
  async finalizar(id: number, dados: FinalizacaoInput) {
    if (this.falhar) throw new Error("Banco indisponível");
    const atual = this.registros.get(id);
    if (!atual) throw new Error("Chamado não encontrado.");
    if (statusEncerraAtendimento(atual.status)) throw new Error("O chamado já está finalizado.");
    const hora_termino = atual.hora_termino || "12:30";
    const observacoes_atendimento = dados.motivo
      ? [atual.observacoes_atendimento, `Motivo da finalização (${dados.status}): ${dados.motivo}`].filter(Boolean).join("\n")
      : atual.observacoes_atendimento;
    this.registros.set(id, { ...atual, status: dados.status, hora_termino, observacoes_atendimento });
    return { status: dados.status, hora_termino, gera_recebimento: statusGeraRecebimento(dados.status) };
  }
  async reabrir(id: number, dados: ReaberturaInput) {
    if (this.falhar) throw new Error("Banco indisponível");
    const atual = this.registros.get(id);
    if (!atual) throw new Error("Chamado não encontrado.");
    if (!statusEncerraAtendimento(atual.status)) {
      throw new Error(`Não é possível reabrir um chamado com status ${atual.status}.`);
    }
    this.reaberturas.push({ chamado_id: id, status_anterior: atual.status, motivo: dados.motivo });
    this.ratAtual.atual = false;
    this.registros.set(id, { ...atual, status: "Em atendimento" });
    return { status: "Em atendimento" as const, reaberto_em: "2026-08-03T13:00:00.000Z" };
  }
  async criarVisita(id: number, dados: NovaVisitaInput) {
    const fonte = this.registros.get(id);
    if (!fonte) throw new Error("Chamado não encontrado.");
    const raiz = fonte.chamado_raiz_id ?? fonte.id;
    const visita_numero = Math.max(
      ...[...this.registros.values()]
        .filter((registro) => registro.id === raiz || registro.chamado_raiz_id === raiz)
        .map((registro) => registro.visita_numero),
    ) + 1;
    const novoId = this.proximoId++;
    this.registros.set(novoId, {
      ...fonte,
      id: novoId,
      visita_numero,
      chamado_raiz_id: raiz,
      data_agendada: dados.data_agendada,
      hora_agendada: dados.hora_agendada,
      unidade_nome: dados.unidade_nome,
      status: "Agendado",
      hora_chegada: "",
      hora_inicio: "",
      hora_termino: "",
      descricao_servico: "",
      observacoes_atendimento: "",
    });
    this.visualizacoes.set(novoId, null);
    return { id: novoId, visita_numero };
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
    this.visualizacoes.set(id, null);
    this.registros.set(id, {
      ...chamado,
      id,
      visita_numero: 1,
      chamado_raiz_id: null,
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

  it("registra somente a primeira visualização do chamado", async () => {
    const gateway = new GatewayMemoria();
    const service = new ChamadosService(gateway);
    const id = await service.importar(importacao(), "teste.eml");

    await expect(service.marcarVisualizado(id)).resolves.toBe(true);
    const primeiraVisualizacao = gateway.visualizacoes.get(id);
    await expect(service.marcarVisualizado(id)).resolves.toBe(false);

    expect(primeiraVisualizacao).toBe("2026-09-15T22:00:00.000Z");
    expect(gateway.visualizacoes.get(id)).toBe(primeiraVisualizacao);
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
    expect((await service.buscar(id))?.status).toBe("Em atendimento");
    await expect(service.atualizar(id, {
      hora_chegada: "25:00",
      hora_inicio: "",
      hora_termino: "",
      descricao_servico: "",
      observacoes_atendimento: "",
    })).rejects.toThrow("HH:MM");
  });

  it("não inicia ao editar outros campos e não reinicia status encerrado", async () => {
    const gateway = new GatewayMemoria();
    const service = new ChamadosService(gateway);
    const id = await service.importar(importacao(), "teste.eml");
    await service.atualizar(id, {
      hora_chegada: "08:50", hora_inicio: "", hora_termino: "",
      descricao_servico: "Preparação", observacoes_atendimento: "", confirmar_alteracao_hora_inicio: false,
    });
    expect((await service.buscar(id))?.status).toBe("Agendado");
    gateway.registros.set(id, { ...(await service.buscar(id))!, status: "Concluído" });
    await service.atualizar(id, {
      hora_chegada: "08:50", hora_inicio: "09:00", hora_termino: "10:00",
      descricao_servico: "Ajuste", observacoes_atendimento: "", confirmar_alteracao_hora_inicio: false,
    });
    expect((await service.buscar(id))?.status).toBe("Concluído");
  });

  it("exige confirmação para alterar hora de início já registrada", async () => {
    const gateway = new GatewayMemoria();
    const service = new ChamadosService(gateway);
    const id = await service.importar(importacao(), "teste.eml");
    await service.atualizar(id, {
      hora_chegada: "", hora_inicio: "09:00", hora_termino: "",
      descricao_servico: "", observacoes_atendimento: "", confirmar_alteracao_hora_inicio: false,
    });
    await expect(service.atualizar(id, {
      hora_chegada: "", hora_inicio: "09:30", hora_termino: "",
      descricao_servico: "", observacoes_atendimento: "", confirmar_alteracao_hora_inicio: false,
    })).rejects.toThrow("Confirme a alteração");
    await expect(service.atualizar(id, {
      hora_chegada: "", hora_inicio: "09:30", hora_termino: "",
      descricao_servico: "", observacoes_atendimento: "", confirmar_alteracao_hora_inicio: true,
    })).resolves.toMatchObject({ hora_inicio: "09:30" });
  });

  it.each([
    ["Concluído", "", true],
    ["Improdutivo", "Cliente ausente", true],
    ["Cancelado", "Solicitação cancelada", false],
  ] as const)("finaliza como %s e aplica recebimento", async (status, motivo, recebimento) => {
    const gateway = new GatewayMemoria();
    const service = new ChamadosService(gateway);
    const id = await service.importar(importacao(), "teste.eml");
    const resultado = await service.finalizar(id, { status, motivo });
    expect(resultado).toMatchObject({ status, gera_recebimento: recebimento });
    expect(resultado.hora_termino).toBe("12:30");
    if (motivo) expect((await service.buscar(id))?.observacoes_atendimento).toContain(motivo);
  });

  it("preserva hora de término e exige motivo nos encerramentos aplicáveis", async () => {
    const gateway = new GatewayMemoria();
    const service = new ChamadosService(gateway);
    const id = await service.importar(importacao(), "teste.eml");
    gateway.registros.set(id, { ...(await service.buscar(id))!, hora_termino: "11:45" });
    await expect(service.finalizar(id, { status: "Cancelado", motivo: "" })).rejects.toThrow("Informe o motivo");
    expect((await service.finalizar(id, { status: "Cancelado", motivo: "Sem acesso" })).hora_termino).toBe("11:45");
  });

  it.each(["Concluído", "Improdutivo", "Cancelado"])("reabre %s como Em atendimento e registra histórico", async (status) => {
    const gateway = new GatewayMemoria();
    const service = new ChamadosService(gateway);
    const id = await service.importar(importacao(), "teste.eml");
    gateway.registros.set(id, {
      ...(await service.buscar(id))!,
      status,
      descricao_servico: "Descrição preservada",
      observacoes_atendimento: "Observação preservada",
      hora_inicio: "09:00",
      hora_termino: "10:30",
    });
    const assinaturaAntes = gateway.assinaturaCliente;
    const caminhoRatAntes = gateway.ratAtual.caminho;
    await expect(service.reabrir(id, { motivo: "Ajuste de descrição" })).resolves.toMatchObject({ status: "Em atendimento" });
    expect(await service.buscar(id)).toMatchObject({
      status: "Em atendimento",
      descricao_servico: "Descrição preservada",
      observacoes_atendimento: "Observação preservada",
      hora_inicio: "09:00",
      hora_termino: "10:30",
    });
    expect(gateway.reaberturas[0]).toMatchObject({ status_anterior: status, motivo: "Ajuste de descrição" });
    expect(gateway.assinaturaCliente).toBe(assinaturaAntes);
    expect(gateway.ratAtual).toMatchObject({ atual: false, caminho: caminhoRatAntes, versao: 1 });
  });

  it.each(["Agendado", "Em atendimento"])("não permite reabrir chamado em %s", async (status) => {
    const gateway = new GatewayMemoria();
    const service = new ChamadosService(gateway);
    const id = await service.importar(importacao(), "teste.eml");
    gateway.registros.set(id, { ...(await service.buscar(id))!, status });
    await expect(service.reabrir(id, { motivo: "Status incorreto" })).rejects.toThrow("Não é possível reabrir");
  });

  it("exige motivo para reabrir", async () => {
    const gateway = new GatewayMemoria();
    const service = new ChamadosService(gateway);
    const id = await service.importar(importacao(), "teste.eml");
    gateway.registros.set(id, { ...(await service.buscar(id))!, status: "Concluído" });
    await expect(service.reabrir(id, { motivo: "   " })).rejects.toThrow("Informe o motivo");
  });

  it("força novos chamados para Agendado na fronteira de persistência", async () => {
    const gateway = new GatewayMemoria();
    const service = new ChamadosService(gateway);
    const id = await service.importar({ ...importacao(), status: "", data_agendada: "", hora_agendada: "" }, "teste.eml");
    expect((await service.buscar(id))?.status).toBe("Agendado");
  });

  it("cria Visita 2 DASA independente e preserva a ocorrência original", async () => {
    const gateway = new GatewayMemoria();
    const service = new ChamadosService(gateway);
    const id = await service.importar({
      ...importacao(),
      numero_chamado: "SR-906366",
      cliente: "DASA",
      equipamento: "Etiquetadora",
      unidade_nome: null,
    }, "dasa.eml");
    gateway.registros.set(id, {
      ...(await service.buscar(id))!,
      status: "Improdutivo",
      hora_inicio: "15:00",
      hora_termino: "15:10",
      descricao_servico: "Diagnóstico da primeira visita",
      observacoes_atendimento: "Visita anterior",
    });

    const criada = await service.criarVisita(id, {
      data_agendada: "2026-09-29",
      hora_agendada: "09:30",
      unidade_nome: "Unidade DASA Teste",
    });

    expect(criada).toEqual({ id: 2, visita_numero: 2 });
    expect(await service.buscar(id)).toMatchObject({
      status: "Improdutivo", hora_inicio: "15:00", descricao_servico: "Diagnóstico da primeira visita",
    });
    expect(await service.buscar(criada.id)).toMatchObject({
      numero_chamado: "SR-906366",
      visita_numero: 2,
      chamado_raiz_id: id,
      status: "Agendado",
      data_agendada: "2026-09-29",
      hora_agendada: "09:30",
      unidade_nome: "Unidade DASA Teste",
      equipamento: "Etiquetadora",
      hora_chegada: "",
      hora_inicio: "",
      hora_termino: "",
      descricao_servico: "",
      observacoes_atendimento: "",
    });
    expect(await service.buscarHash("hash-1")).toMatchObject({ chamado_id: id });
  });

  it("cria Visita 3 a partir da Visita 2 apontando diretamente para a raiz", async () => {
    const gateway = new GatewayMemoria();
    const service = new ChamadosService(gateway);
    const raiz = await service.importar({ ...importacao(), cliente: "DASA", unidade_nome: "Unidade Raiz" }, "dasa.eml");
    gateway.registros.set(raiz, { ...(await service.buscar(raiz))!, status: "Improdutivo" });
    const visita2 = await service.criarVisita(raiz, {
      data_agendada: "2026-09-29", hora_agendada: "09:30", unidade_nome: "Unidade 2",
    });
    gateway.registros.set(visita2.id, { ...(await service.buscar(visita2.id))!, status: "Concluído" });
    const visita3 = await service.criarVisita(visita2.id, {
      data_agendada: "2026-10-01", hora_agendada: "10:00", unidade_nome: "Unidade 3",
    });

    expect(visita3.visita_numero).toBe(3);
    expect(await service.buscar(visita3.id)).toMatchObject({ chamado_raiz_id: raiz, visita_numero: 3 });
    expect((await service.listarVisitas(visita2.id)).map(({ visita_numero }) => visita_numero)).toEqual([1, 2, 3]);
  });

  it("inicia, finaliza e reabre somente a visita informada", async () => {
    const gateway = new GatewayMemoria();
    const service = new ChamadosService(gateway);
    const raiz = await service.importar({ ...importacao(), cliente: "DASA", unidade_nome: "Unidade" }, "dasa.eml");
    gateway.registros.set(raiz, { ...(await service.buscar(raiz))!, status: "Improdutivo", hora_inicio: "08:00", hora_termino: "08:30" });
    const visita2 = await service.criarVisita(raiz, {
      data_agendada: "2026-09-29", hora_agendada: "09:30", unidade_nome: "Unidade",
    });

    await service.atualizar(visita2.id, {
      hora_chegada: "09:20", hora_inicio: "09:30", hora_termino: "", descricao_servico: "Visita 2", observacoes_atendimento: "", confirmar_alteracao_hora_inicio: false,
    });
    await service.finalizar(visita2.id, { status: "Concluído", motivo: "" });
    await service.reabrir(visita2.id, { motivo: "Correção da visita 2" });

    expect(await service.buscar(raiz)).toMatchObject({ status: "Improdutivo", hora_inicio: "08:00", hora_termino: "08:30" });
    expect(await service.buscar(visita2.id)).toMatchObject({ status: "Em atendimento", hora_inicio: "09:30", descricao_servico: "Visita 2" });
    expect(gateway.reaberturas).toEqual([{ chamado_id: visita2.id, status_anterior: "Concluído", motivo: "Correção da visita 2" }]);
  });

  it("exige unidade e restringe nova visita a DASA encerrado", async () => {
    const gateway = new GatewayMemoria();
    const service = new ChamadosService(gateway);
    const claro = await service.importar(importacao(), "claro.eml");
    gateway.registros.set(claro, { ...(await service.buscar(claro))!, status: "Concluído" });
    await expect(service.criarVisita(claro, {
      data_agendada: "2026-09-29", hora_agendada: "09:30", unidade_nome: "Unidade",
    })).rejects.toThrow("somente para chamados DASA");

    const dasa = await service.importar({ ...importacao("hash-2"), cliente: "DASA" }, "dasa.eml");
    gateway.registros.set(dasa, { ...(await service.buscar(dasa))!, status: "Improdutivo" });
    await expect(service.criarVisita(dasa, {
      data_agendada: "2026-09-29", hora_agendada: "09:30", unidade_nome: " ",
    })).rejects.toThrow("Unidade/Nome");
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
