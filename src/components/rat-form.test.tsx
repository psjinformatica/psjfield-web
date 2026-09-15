import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { RatForm } from "@/components/rat-form";
import type { RatRevisao } from "@/lib/rat-types";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

const revisao: RatRevisao = {
  chamado: "MI-100", data_inicio: "2026-07-31", hora_inicio: "09:00", data_fim: "2026-07-31", hora_fim: "10:00",
  login: "login", colaborador: "Cliente", telefone: "", email: "", localidade: "Curitiba/PR",
  tipos_ocorrencia: ["Manutenção"], tipo_equipamento: "Notebook", outro_equipamento: "", dominio: "",
  atual_serial: "S1", atual_ae: "AE1", atual_fabricante: "Dell", atual_modelo: "5400", atual_processador: "", atual_hd: "", atual_hostname: "", atual_memoria: "",
  novo_serial: "", novo_ae: "", novo_fabricante: "", novo_modelo: "", novo_processador: "", novo_hd: "", novo_hostname: "", novo_memoria: "",
  pasta_perfil_pst: "", software: "", itens_afetados: [], memoria_frequencia: "", item_outros: "", part_number: "", centro_custo: "",
  diagnosticos: [], diagnostico_outros: "", descricao: "Atendimento concluído", status_equipamento: [], condicao_equipamento: "", qualificacao: "", validacoes_finais: [],
  recebido_laboratorio: false, recebido_estoque: false, analista_logistica: "", data_hora_logistica: "",
};

describe("RatForm Claro", () => {
  it("preserva o formulário e os campos usados pelo modelo atual", () => {
    const html = renderToStaticMarkup(<RatForm chamadoId={1} status="Concluído" inicial={revisao} versoes={[]} />);

    expect(html).toContain("Revisão da RAT");
    expect(html).toContain("Tipo de ocorrência");
    expect(html).toContain("Equipamento atual");
    expect(html).toContain("Equipamento novo (opcional)");
    expect(html).toContain("Validação final");
    expect(html).toContain("Gerar RAT em PDF");
    expect(html).toContain('name="chamado"');
    expect(html).toContain('value="MI-100"');
  });
});
