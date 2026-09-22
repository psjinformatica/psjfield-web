import { describe, expect, it } from "vitest";

import { filtrarChamados } from "@/lib/chamados-filter";
import { ordenarChamados, type ChamadoOrdenavel } from "@/lib/chamados-order";

function chamado(
  id: number,
  status: string,
  dados: Partial<ChamadoOrdenavel> = {},
): ChamadoOrdenavel {
  return {
    id,
    numero_chamado: `CH-${id}`,
    status,
    data_agendada: "",
    hora_agendada: "",
    cliente: "Cliente",
    projeto: "Projeto",
    cidade: "Curitiba",
    estado: "PR",
    atividade: "Atividade",
    valor_base: "100.00",
    valor_financeiro: null,
    valor_card: "100.00",
    pendencia_financeira: false,
    visualizado_em: "2026-09-15T12:00:00.000Z",
    ...dados,
  };
}

function ids(chamados: ChamadoOrdenavel[]) {
  return chamados.map((item) => item.id);
}

describe("ordenação dos chamados", () => {
  it("coloca agendados primeiro em ordem crescente de data e hora", () => {
    const resultado = ordenarChamados([
      chamado(21, "Agendado", { data_agendada: "2026-09-21", hora_agendada: "10:00" }),
      chamado(20, "Agendado", { data_agendada: "2026-09-15", hora_agendada: "09:00" }),
      chamado(24, "Agendado", { data_agendada: "2026-09-15", hora_agendada: "08:30" }),
      chamado(23, "Agendado", { data_agendada: "2026-09-16", hora_agendada: "14:00" }),
      chamado(22, "Agendado", { data_agendada: "2026-09-18", hora_agendada: "10:00" }),
    ]);

    expect(ids(resultado)).toEqual([24, 20, 23, 22, 21]);
  });

  it("mistura concluídos e improdutivos pelo encerramento mais recente", () => {
    const resultado = ordenarChamados([
      chamado(4, "Concluído", { encerrado_em: "2026-07-30T22:10:00.000Z" }),
      chamado(11, "Improdutivo", { encerrado_em: "2026-07-23T17:50:00.000Z" }),
      chamado(12, "Concluído", { encerrado_em: "2026-07-23T17:30:00.000Z" }),
      chamado(10, "Concluído", { encerrado_em: "2026-07-29T17:10:00.000Z" }),
      chamado(9, "Concluído", { encerrado_em: "2026-07-31T14:05:00.000Z" }),
      chamado(13, "Concluído", { encerrado_em: "2026-08-11T14:13:00.000Z" }),
      chamado(19, "Concluído", { encerrado_em: "2026-09-10T15:37:38.402Z" }),
    ]);

    expect(ids(resultado)).toEqual([19, 13, 9, 4, 10, 11, 12]);
  });

  it("desempata pelo maior ID", () => {
    const encerramento = "2026-09-10T15:37:38.402Z";
    const resultado = ordenarChamados([
      chamado(30, "Concluído", { encerrado_em: encerramento }),
      chamado(31, "Improdutivo", { encerrado_em: encerramento }),
    ]);

    expect(ids(resultado)).toEqual([31, 30]);
  });

  it("mantém valores nulos depois dos valores cronológicos válidos", () => {
    const resultado = ordenarChamados([
      chamado(1, "Agendado", { data_agendada: null as unknown as string }),
      chamado(2, "Agendado", {
        data_agendada: "2026-09-15",
        hora_agendada: null as unknown as string,
      }),
      chamado(3, "Agendado", { data_agendada: "2026-09-15", hora_agendada: "09:00" }),
      chamado(4, "Concluído"),
      chamado(5, "Improdutivo", { encerrado_em: "2026-09-10T15:37:38.402Z" }),
    ]);

    expect(ids(resultado)).toEqual([3, 2, 1, 5, 4]);
  });

  it("coloca os demais estados depois dos agendados e encerrados", () => {
    const resultado = ordenarChamados([
      chamado(8, "Cancelado", { atualizado_em: "2026-09-15T12:00:00.000Z" }),
      chamado(7, "Em atendimento", { atualizado_em: "2026-09-15T13:00:00.000Z" }),
      chamado(6, "Concluído", { encerrado_em: "2026-09-10T15:37:38.402Z" }),
      chamado(5, "Agendado", { data_agendada: "2026-09-16", hora_agendada: "09:00" }),
    ]);

    expect(ids(resultado)).toEqual([5, 6, 7, 8]);
  });

  it("preserva a ordem ao filtrar por status ou busca", () => {
    const ordenados = ordenarChamados([
      chamado(3, "Concluído", { encerrado_em: "2026-09-10T15:37:38.402Z", cliente: "DASA" }),
      chamado(1, "Agendado", { data_agendada: "2026-09-15", hora_agendada: "09:00", cliente: "DASA" }),
      chamado(2, "Agendado", { data_agendada: "2026-09-16", hora_agendada: "14:00", cliente: "Claro" }),
    ]);

    expect(ids(filtrarChamados(ordenados, "", "Agendado"))).toEqual([1, 2]);
    expect(ids(filtrarChamados(ordenados, "dasa", "Todos"))).toEqual([1, 3]);
  });
});
