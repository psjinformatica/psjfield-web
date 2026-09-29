import { readFile } from "node:fs/promises";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ getSql: vi.fn() }));
vi.mock("@/lib/db-observability", () => ({
  observeDatabaseOperation: (_nome: string, operacao: () => unknown) => operacao(),
}));

import { dadosEditaveisDoChamado } from "@/lib/chamados-edicao";
import { buscarContextoEdicaoChamado, editarDadosChamado } from "@/lib/chamados-edicao-repository";
import { getSql } from "@/lib/db";
import { chamadoDasaSeguro } from "@/test/fixtures/rat-dasa";

type Fragmento = { dados: Record<string, unknown>; campos: string[] };

function bancoEdicao(opcoes: {
  falharAuditoria?: boolean;
  possuiRecebivel?: boolean;
  status?: string;
  enderecoVisita1?: string;
} = {}) {
  const status = opcoes.status ?? chamadoDasaSeguro.status;
  const visita1 = {
    ...chamadoDasaSeguro,
    id: 24,
    visita_numero: 1,
    chamado_raiz_id: null,
    endereco: opcoes.enderecoVisita1 ?? "Endereço antigo",
    status,
  };
  const visita2 = { ...chamadoDasaSeguro, id: 25, visita_numero: 2, chamado_raiz_id: 24, endereco: "Endereço antigo", status };
  const registros = [visita1, visita2];
  const atualizacoesConfirmadas: Array<{ id: number; fragmento: Fragmento }> = [];
  const auditoriasConfirmadas: number[] = [];

  const criarTag = (transacional = false) => {
    const atualizacoesPendentes: Array<{ id: number; fragmento: Fragmento }> = [];
    const auditoriasPendentes: number[] = [];
    const tag = ((primeiro: TemplateStringsArray | Record<string, unknown>, ...valores: unknown[]) => {
      if (!Array.isArray(primeiro) || !Object.prototype.hasOwnProperty.call(primeiro, "raw")) {
        return { dados: primeiro, campos: valores } satisfies Fragmento;
      }
      const sql = (primeiro as TemplateStringsArray).join("?");
      if (sql.includes("FROM chamados c")) return Promise.resolve([{ ...visita2, possui_recebivel: Boolean(opcoes.possuiRecebivel) }]);
      if (sql.includes("SELECT id, chamado_raiz_id")) return Promise.resolve([{ id: 25, chamado_raiz_id: 24 }]);
      if (sql.includes("FROM chamados") && sql.includes("ORDER BY")) return Promise.resolve(registros);
      if (sql.includes("FROM chamados_alteracoes")) return Promise.resolve([]);
      if (sql.includes("SELECT EXISTS")) return Promise.resolve([{ existe: Boolean(opcoes.possuiRecebivel) }]);
      if (sql.includes("UPDATE chamados")) {
        const fragmento = valores.find((valor) => valor && typeof valor === "object" && "campos" in valor) as Fragmento;
        const id = Number(valores.at(-1));
        atualizacoesPendentes.push({ id, fragmento });
        return Promise.resolve([]);
      }
      if (sql.includes("INSERT INTO chamados_alteracoes")) {
        if (opcoes.falharAuditoria) return Promise.reject(new Error("falha de auditoria"));
        auditoriasPendentes.push(Number(valores[0]));
        return Promise.resolve([]);
      }
      return Promise.resolve([]);
    }) as never as {
      (strings: TemplateStringsArray, ...valores: unknown[]): Promise<unknown[]>;
      (dados: Record<string, unknown>, ...campos: string[]): Fragmento;
      unsafe: (valor: string) => string;
      json: (valor: unknown) => unknown;
      begin?: (operacao: (tx: typeof tag) => Promise<unknown>) => Promise<unknown>;
    };
    tag.unsafe = (valor) => valor;
    tag.json = (valor) => valor;
    if (!transacional) {
      tag.begin = async (operacao) => {
        const tx = criarTag(true);
        const resultado = await operacao(tx);
        atualizacoesConfirmadas.push(...(tx as typeof tx & { _updates: typeof atualizacoesPendentes })._updates);
        auditoriasConfirmadas.push(...(tx as typeof tx & { _audits: typeof auditoriasPendentes })._audits);
        return resultado;
      };
    }
    Object.assign(tag, { _updates: atualizacoesPendentes, _audits: auditoriasPendentes });
    return tag;
  };
  vi.mocked(getSql).mockReturnValue(criarTag() as never);
  return { registros, atualizacoesConfirmadas, auditoriasConfirmadas };
}

describe("persistência da edição cadastral", () => {
  beforeEach(() => vi.clearAllMocks());

  it("trava o grupo, detecta concorrência e grava chamado + auditoria na mesma transação", async () => {
    const fonte = await readFile(new URL("./chamados-edicao-repository.ts", import.meta.url), "utf8");
    const edicao = fonte.slice(fonte.indexOf("export async function editarDadosChamado"));
    expect(edicao).toContain("sql.begin");
    expect(edicao).toContain("FOR UPDATE");
    expect(edicao).toContain("criarVersaoDados(dadosAtuais) !== entrada.versao_dados");
    expect(edicao).toContain("criarVersaoGrupo(relacionadas) !== entrada.versao_grupo");
    expect(edicao).toContain("UPDATE chamados");
    expect(edicao).toContain("registrarAuditoria(transacao");
    expect(edicao).not.toContain("UPDATE rats");
    expect(edicao).not.toContain("UPDATE contas_receber");
    expect(edicao).not.toContain("atualizado_em =");
  });

  it("bloqueia parâmetros financeiros consolidados e propaga somente campos compartilháveis", async () => {
    const fonte = await readFile(new URL("./chamados-edicao-repository.ts", import.meta.url), "utf8");
    expect(fonte).toContain("Financeiro deste chamado já foi consolidado");
    expect(fonte).toContain("CAMPOS_COMPARTILHAVEIS_VISITAS");
    expect(fonte).toContain("TODAS_VISITAS_RELACIONADAS");
  });

  it("edita somente a visita escolhida e registra auditoria", async () => {
    const banco = bancoEdicao();
    const contexto = await buscarContextoEdicaoChamado(25);
    const dados = { ...dadosEditaveisDoChamado(contexto!.chamado), endereco: "Avenida Presidente Kennedy, 4121" };

    await expect(editarDadosChamado(25, {
      dados,
      escopo: "SOMENTE_ESTA_VISITA",
      versao_dados: contexto!.versao_dados,
      versao_grupo: contexto!.versao_grupo,
    })).resolves.toMatchObject({ alterados: 1, campos_alterados: ["endereco"] });
    expect(banco.atualizacoesConfirmadas).toHaveLength(1);
    expect(banco.atualizacoesConfirmadas[0]).toMatchObject({ id: 25, fragmento: { dados: { endereco: "Avenida Presidente Kennedy, 4121" } } });
    expect(banco.auditoriasConfirmadas).toEqual([25]);
  });

  it("propaga explicitamente campos compartilháveis para raiz e derivadas", async () => {
    const banco = bancoEdicao();
    const contexto = await buscarContextoEdicaoChamado(25);
    const dados = { ...dadosEditaveisDoChamado(contexto!.chamado), endereco: "Endereço comum corrigido", observacoes: "Só visita 2" };

    await expect(editarDadosChamado(25, {
      dados,
      escopo: "TODAS_VISITAS_RELACIONADAS",
      versao_dados: contexto!.versao_dados,
      versao_grupo: contexto!.versao_grupo,
    })).resolves.toMatchObject({ alterados: 2 });
    expect(banco.atualizacoesConfirmadas.map((item) => item.id)).toEqual([24, 25]);
    expect(banco.atualizacoesConfirmadas.find((item) => item.id === 24)?.fragmento.dados).toEqual({ endereco: "Endereço comum corrigido" });
    expect(banco.atualizacoesConfirmadas.find((item) => item.id === 25)?.fragmento.dados).toEqual({ endereco: "Endereço comum corrigido", observacoes: "Só visita 2" });
  });

  it("não atualiza nem audita visita relacionada que já possui o valor compartilhado", async () => {
    const enderecoCorrigido = "Avenida Presidente Kennedy, 4121";
    const banco = bancoEdicao({ enderecoVisita1: enderecoCorrigido });
    const contexto = await buscarContextoEdicaoChamado(25);
    const dados = { ...dadosEditaveisDoChamado(contexto!.chamado), endereco: enderecoCorrigido };

    await expect(editarDadosChamado(25, {
      dados,
      escopo: "TODAS_VISITAS_RELACIONADAS",
      versao_dados: contexto!.versao_dados,
      versao_grupo: contexto!.versao_grupo,
    })).resolves.toMatchObject({ alterados: 1, campos_alterados: ["endereco"] });
    expect(banco.atualizacoesConfirmadas).toHaveLength(1);
    expect(banco.atualizacoesConfirmadas[0]?.id).toBe(25);
    expect(banco.auditoriasConfirmadas).toEqual([25]);
  });

  it("reverte a atualização quando a auditoria falha", async () => {
    const banco = bancoEdicao({ falharAuditoria: true });
    const contexto = await buscarContextoEdicaoChamado(25);
    const dados = { ...dadosEditaveisDoChamado(contexto!.chamado), unidade_nome: "Unidade corrigida" };

    await expect(editarDadosChamado(25, {
      dados,
      escopo: "SOMENTE_ESTA_VISITA",
      versao_dados: contexto!.versao_dados,
      versao_grupo: contexto!.versao_grupo,
    })).rejects.toThrow("falha de auditoria");
    expect(banco.atualizacoesConfirmadas).toHaveLength(0);
    expect(banco.auditoriasConfirmadas).toHaveLength(0);
  });

  it("detecta edição concorrente antes de qualquer escrita", async () => {
    const banco = bancoEdicao();
    const contexto = await buscarContextoEdicaoChamado(25);
    await expect(editarDadosChamado(25, {
      dados: { ...dadosEditaveisDoChamado(contexto!.chamado), telefone: "9999" },
      escopo: "SOMENTE_ESTA_VISITA",
      versao_dados: "0".repeat(64),
      versao_grupo: contexto!.versao_grupo,
    })).rejects.toThrow("alterados em outra tela");
    expect(banco.atualizacoesConfirmadas).toHaveLength(0);
  });

  it("não altera parâmetros financeiros quando já existe recebível", async () => {
    const banco = bancoEdicao({ possuiRecebivel: true });
    const contexto = await buscarContextoEdicaoChamado(25);
    await expect(editarDadosChamado(25, {
      dados: { ...dadosEditaveisDoChamado(contexto!.chamado), valor_base: "130" },
      escopo: "SOMENTE_ESTA_VISITA",
      versao_dados: contexto!.versao_dados,
      versao_grupo: contexto!.versao_grupo,
    })).rejects.toThrow("Financeiro deste chamado já foi consolidado");
    expect(banco.atualizacoesConfirmadas).toHaveLength(0);
  });

  it.each(["Concluído", "Improdutivo"])(
    "não altera parâmetros financeiros quando o atendimento está %s, mesmo sem recebível",
    async (status) => {
      const banco = bancoEdicao({ status });
      const contexto = await buscarContextoEdicaoChamado(25);
      await expect(editarDadosChamado(25, {
        dados: { ...dadosEditaveisDoChamado(contexto!.chamado), valor_base: "130" },
        escopo: "SOMENTE_ESTA_VISITA",
        versao_dados: contexto!.versao_dados,
        versao_grupo: contexto!.versao_grupo,
      })).rejects.toThrow("atendimento já foi encerrado");
      expect(banco.atualizacoesConfirmadas).toHaveLength(0);
    },
  );
});
