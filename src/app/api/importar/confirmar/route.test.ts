import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ChamadoImportacao, PreviaImportacao } from "@/lib/types";

const dependencias = vi.hoisted(() => ({
  interpretar: vi.fn(),
  importar: vi.fn(),
}));

vi.mock("@/lib/parser", () => ({ interpretarEml: dependencias.interpretar }));
vi.mock("@/lib/server-service", () => ({ chamadosService: { importar: dependencias.importar } }));

import { POST } from "@/app/api/importar/confirmar/route";

function chamadoOriginal(): ChamadoImportacao {
  return {
    numero_chamado: "SR-900001", empresa_parceira: "Grupo Easy", cliente: "DASA", projeto: "DASA",
    assunto_email: "Atendimento SR-900001", remetente: "origem@example.invalid", destinatario: "destino@example.invalid",
    data_email: "2026-09-29T10:00:00.000Z", data_agendada: "2026-09-30", hora_agendada: "09:30",
    usuario_responsavel: "Solicitante", contato: "Solicitante", telefone: "", unidade_nome: "Unidade original",
    endereco: "Avenida Presindente Kennedy 4121", cidade: "Curitiba", estado: "PR", atividade: "Falha informada",
    descricao: "", equipamento: "Equipamento original", fabricante: "ZEBRA", modelo: "ZD220T",
    patrimonio_ae: "N/A", numero_serie: "SERIE-1", valor_base: "100", horas_incluidas: "3",
    valor_hora_adicional: "30", status: "Agendado", observacoes: "", caminho_email: "",
    hash_email: "a".repeat(64), corpo_email: "corpo original", criado_em: "2026-09-29T10:00:00.000Z",
    atualizado_em: "2026-09-29T10:00:00.000Z",
  };
}

function requisicao(dados: Record<string, unknown>) {
  const form = new FormData();
  form.set("arquivo", new File(["email seguro"], "fixture.eml", { type: "message/rfc822" }));
  form.set("dados", JSON.stringify(dados));
  return new Request("http://localhost/api/importar/confirmar", { method: "POST", body: form });
}

describe("POST /api/importar/confirmar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dependencias.interpretar.mockResolvedValue({
      chamado: chamadoOriginal(), reconhecidoGrupoEasy: true, nomeArquivo: "fixture.eml",
    } satisfies PreviaImportacao);
    dependencias.importar.mockResolvedValue(42);
  });

  it("persiste unidade, endereço e equipamento revisados pelo usuário", async () => {
    const resposta = await POST(requisicao({
      unidade_nome: "Unidade revisada",
      endereco: "Avenida Presidente Kennedy, 4121",
      equipamento: "Etiquetadora",
      usuario_responsavel: "login.revisado",
    }));

    expect(resposta.status).toBe(200);
    expect(dependencias.importar).toHaveBeenCalledWith(expect.objectContaining({
      unidade_nome: "Unidade revisada",
      endereco: "Avenida Presidente Kennedy, 4121",
      equipamento: "Etiquetadora",
      usuario_responsavel: "login.revisado",
      fabricante: "ZEBRA",
      hash_email: "a".repeat(64),
    }), "fixture.eml");
  });

  it("rejeita número inválido antes da persistência", async () => {
    const resposta = await POST(requisicao({ numero_chamado: "chamado inválido" }));

    expect(resposta.status).toBe(400);
    await expect(resposta.json()).resolves.toMatchObject({ erro: expect.stringContaining("Número do chamado inválido") });
    expect(dependencias.importar).not.toHaveBeenCalled();
  });

  it("aceita INC revisado e preserva a proveniência usada na deduplicação", async () => {
    const resposta = await POST(requisicao({ numero_chamado: "INC-924376" }));

    expect(resposta.status).toBe(200);
    expect(dependencias.importar).toHaveBeenCalledWith(expect.objectContaining({
      numero_chamado: "INC-924376",
      hash_email: "a".repeat(64),
      corpo_email: "corpo original",
    }), "fixture.eml");
  });
});
