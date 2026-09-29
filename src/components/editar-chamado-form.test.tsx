import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn() }) }));

import { EditarChamadoForm, resumirAlteracoesEdicao, solicitarEdicaoChamado } from "@/components/editar-chamado-form";
import { dadosEditaveisDoChamado, type ContextoEdicaoChamado } from "@/lib/chamados-edicao";
import { chamadoDasaSeguro } from "@/test/fixtures/rat-dasa";

function contexto(opcoes: Partial<ContextoEdicaoChamado> = {}): ContextoEdicaoChamado {
  return {
    chamado: chamadoDasaSeguro,
    possui_recebivel: false,
    quantidade_visitas: 2,
    versao_dados: "a".repeat(64),
    versao_grupo: "b".repeat(64),
    alteracoes: [],
    ...opcoes,
  };
}

describe("EditarChamadoForm", () => {
  it.each(["Agendado", "Em atendimento", "Concluído", "Improdutivo"])(
    "renderiza a edição para chamado %s",
    (status) => {
      const html = renderToStaticMarkup(<EditarChamadoForm contexto={contexto({
        chamado: { ...chamadoDasaSeguro, status },
      })} />);
      expect(html).toContain("Unidade/Nome");
      expect(html).toContain("Endereço");
      expect(html).toContain("Equipamento");
      expect(html).toContain("Revisar alterações");
    },
  );

  it("mantém textos longos responsivos em textareas", () => {
    const html = renderToStaticMarkup(<EditarChamadoForm contexto={contexto()} />);
    expect(html).toContain("<textarea");
    expect(html).toContain("Atividade/Defeito/Solicitação original");
    expect(html).toContain("Observações");
  });

  it("deixa parâmetros financeiros somente leitura quando já existe recebível", () => {
    const html = renderToStaticMarkup(<EditarChamadoForm contexto={contexto({ possui_recebivel: true })} />);
    expect(html).toContain("Financeiro já consolidado");
    expect(html).toMatch(/id="campo-valor_base"[^>]*disabled/);
    expect(html).toMatch(/id="campo-horas_incluidas"[^>]*disabled/);
  });

  it.each(["Concluído", "Improdutivo"])(
    "deixa parâmetros financeiros somente leitura quando o atendimento está %s sem recebível",
    (status) => {
      const html = renderToStaticMarkup(<EditarChamadoForm contexto={contexto({
        chamado: { ...chamadoDasaSeguro, status },
        possui_recebivel: false,
      })} />);
      expect(html).toContain("Atendimento já encerrado");
      expect(html).toMatch(/id="campo-valor_base"[^>]*disabled/);
      expect(html).toMatch(/id="campo-valor_hora_adicional"[^>]*disabled/);
    },
  );

  it("resume antes/depois sem misturar campos não alterados", () => {
    const anterior = dadosEditaveisDoChamado(chamadoDasaSeguro);
    const resumo = resumirAlteracoesEdicao(anterior, {
      ...anterior,
      endereco: "Avenida Presidente Kennedy, 4121",
    });
    expect(resumo).toEqual([expect.objectContaining({
      campo: "endereco",
      anterior: chamadoDasaSeguro.endereco,
      novo: "Avenida Presidente Kennedy, 4121",
    })]);
  });

  it("envia uma única atualização para a API dedicada", async () => {
    const solicitar = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    await solicitarEdicaoChamado(25, { escopo: "SOMENTE_ESTA_VISITA" }, solicitar);
    expect(solicitar).toHaveBeenCalledOnce();
    expect(solicitar).toHaveBeenCalledWith("/api/chamados/25/dados", expect.objectContaining({ method: "PUT" }));
  });
});
