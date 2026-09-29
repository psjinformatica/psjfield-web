import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ContextoEdicaoChamado } from "@/lib/chamados-edicao";
import { chamadoDasaSeguro } from "@/test/fixtures/rat-dasa";

const dependencias = vi.hoisted(() => ({ buscarContexto: vi.fn() }));

vi.mock("next/navigation", () => ({ notFound: () => { throw new Error("not-found"); } }));
vi.mock("@/lib/db-observability", () => ({ observeRequest: (_rota: string, executar: () => unknown) => executar() }));
vi.mock("@/lib/server-service", () => ({ chamadosService: { buscarContextoEdicao: dependencias.buscarContexto } }));
vi.mock("@/components/editar-chamado-form", () => ({ EditarChamadoForm: () => <div>FORMULÁRIO EDITÁVEL</div> }));

import EditarChamado from "@/app/chamados/[id]/editar/page";

function contexto(status: string): ContextoEdicaoChamado {
  return {
    chamado: { ...chamadoDasaSeguro, id: 25, visita_numero: 2, chamado_raiz_id: 24, status },
    possui_recebivel: true,
    quantidade_visitas: 2,
    versao_dados: "a".repeat(64),
    versao_grupo: "b".repeat(64),
    alteracoes: [],
  };
}

describe("página de edição do chamado", () => {
  beforeEach(() => vi.clearAllMocks());

  it.each(["Agendado", "Em atendimento", "Concluído", "Improdutivo"])(
    "permanece disponível para status %s e visita derivada",
    async (status) => {
      dependencias.buscarContexto.mockResolvedValue(contexto(status));
      const pagina = await EditarChamado({ params: Promise.resolve({ id: "25" }) });
      const html = renderToStaticMarkup(pagina);
      expect(html).toContain("Editar dados do chamado");
      expect(html).toContain("Visita 2");
      expect(html).toContain(`status permanece ${status}`);
      expect(html).toContain("FORMULÁRIO EDITÁVEL");
      expect(html).toContain('href="/chamados/25"');
    },
  );
});
