import { describe, expect, it } from "vitest";

import { mapearChamadoParaRat } from "@/lib/rat-mapper";
import type { Chamado } from "@/lib/types";

const chamado = {
  id: 1, numero_chamado: "MI-100", status: "Concluído", data_agendada: "2026-07-31", hora_agendada: "09:00",
  hora_inicio: "09:15", hora_termino: "10:30", cliente: "Claro", projeto: "", cidade: "Curitiba", estado: "PR",
  atividade: "Troca", valor_base: null, empresa_parceira: "", assunto_email: "", remetente: "", destinatario: "",
  data_email: "", usuario_responsavel: "login", contato: "Ana", telefone: "41999990000", endereco: "Rua A",
  descricao: "", equipamento: "Notebook", fabricante: "Dell", modelo: "5400", patrimonio_ae: "AE1", numero_serie: "S1",
  horas_incluidas: null, valor_hora_adicional: null, observacoes: "", hora_chegada: "09:00", descricao_servico: "Atendimento",
  observacoes_atendimento: "",
} satisfies Chamado;

describe("mapearChamadoParaRat", () => {
  it("preenche somente dados existentes e preserva campos específicos vazios", () => {
    const rat = mapearChamadoParaRat(chamado, null);
    expect(rat).toMatchObject({ chamado: "MI-100", hora_inicio: "09:15", tipo_equipamento: "Notebook", atual_serial: "S1", localidade: "Rua A - Curitiba/PR" });
    expect(rat.dominio).toBe("");
    expect(rat.diagnosticos).toEqual([]);
    expect(rat.descricao).toBe("");
    expect(chamado.atividade).toBe("Troca");
    expect(chamado.descricao_servico).toBe("Atendimento");
  });
});
