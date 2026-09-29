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
      chamado(4, "Concluído", { encerrado_operacional_em: "2026-07-30T22:10:00.000Z" }),
      chamado(11, "Improdutivo", { encerrado_operacional_em: "2026-07-23T17:50:00.000Z" }),
      chamado(12, "Concluído", { encerrado_operacional_em: "2026-07-23T17:30:00.000Z" }),
      chamado(10, "Concluído", { encerrado_operacional_em: "2026-07-29T17:10:00.000Z" }),
      chamado(9, "Concluído", { encerrado_operacional_em: "2026-07-31T14:05:00.000Z" }),
      chamado(13, "Concluído", { encerrado_operacional_em: "2026-08-11T14:13:00.000Z" }),
      chamado(19, "Concluído", { encerrado_operacional_em: "2026-09-10T15:37:38.402Z" }),
    ]);

    expect(ids(resultado)).toEqual([19, 13, 9, 4, 10, 11, 12]);
  });

  it("mantém improdutivo recente sem recebível acima de concluído antigo com recebível", () => {
    const resultado = ordenarChamados([
      {
        ...chamado(10, "Concluído", {
          encerrado_operacional_em: "2026-07-30T18:00:00.000Z",
        }),
        valor_financeiro: "100.00",
      },
      {
        ...chamado(24, "Improdutivo", {
          encerrado_operacional_em: "2026-09-28T18:10:00.000Z",
        }),
        valor_financeiro: null,
      },
    ]);

    expect(ids(resultado)).toEqual([24, 10]);
  });

  it("ordena visitas do mesmo número externo pelo encerramento da própria ocorrência", () => {
    const resultado = ordenarChamados([
      {
        ...chamado(24, "Improdutivo", {
          encerrado_operacional_em: "2026-09-28T18:10:00.000Z",
        }),
        numero_chamado: "SR-906366",
        visita_numero: 1,
      },
      {
        ...chamado(25, "Concluído", {
          encerrado_operacional_em: "2026-09-29T13:20:00.000Z",
        }),
        numero_chamado: "SR-906366",
        visita_numero: 2,
      },
    ]);

    expect(ids(resultado)).toEqual([25, 24]);
  });

  it("reproduz em fixture equivalente a sequência cronológica atual dos encerrados", () => {
    const resultado = ordenarChamados([
      chamado(20, "Concluído", { encerrado_operacional_em: "2026-09-16T01:06:32.164Z" }),
      chamado(21, "Concluído", { encerrado_operacional_em: "2026-09-21T22:55:25.299Z" }),
      chamado(22, "Concluído", { encerrado_operacional_em: "2026-09-18T13:50:09.912Z" }),
      chamado(23, "Concluído", { encerrado_operacional_em: "2026-09-16T20:16:25.044Z" }),
      chamado(24, "Improdutivo", { encerrado_operacional_em: "2026-09-28T18:10:00.000Z" }),
      chamado(25, "Concluído", { encerrado_operacional_em: "2026-09-29T13:21:43.938Z" }),
    ]);

    expect(ids(resultado)).toEqual([25, 24, 21, 22, 23, 20]);
  });

  it("desempata pelo maior ID", () => {
    const encerramento = "2026-09-10T15:37:38.402Z";
    const resultado = ordenarChamados([
      chamado(30, "Concluído", { encerrado_operacional_em: encerramento }),
      chamado(31, "Improdutivo", { encerrado_operacional_em: encerramento }),
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
      chamado(5, "Improdutivo", { encerrado_operacional_em: "2026-09-10T15:37:38.402Z" }),
    ]);

    expect(ids(resultado)).toEqual([3, 2, 1, 5, 4]);
  });

  it("coloca os demais estados depois dos agendados e encerrados", () => {
    const resultado = ordenarChamados([
      chamado(8, "Cancelado", { atualizado_em: "2026-09-15T12:00:00.000Z" }),
      chamado(7, "Em atendimento", { atualizado_em: "2026-09-15T13:00:00.000Z" }),
      chamado(6, "Concluído", { encerrado_operacional_em: "2026-09-10T15:37:38.402Z" }),
      chamado(5, "Agendado", { data_agendada: "2026-09-16", hora_agendada: "09:00" }),
    ]);

    expect(ids(resultado)).toEqual([5, 6, 7, 8]);
  });

  it("preserva a ordem ao filtrar por status ou busca", () => {
    const ordenados = ordenarChamados([
      chamado(3, "Concluído", { encerrado_operacional_em: "2026-09-10T15:37:38.402Z", cliente: "DASA" }),
      chamado(1, "Agendado", { data_agendada: "2026-09-15", hora_agendada: "09:00", cliente: "DASA" }),
      chamado(2, "Agendado", { data_agendada: "2026-09-16", hora_agendada: "14:00", cliente: "Claro" }),
    ]);

    expect(ids(filtrarChamados(ordenados, "", "Agendado"))).toEqual([1, 2]);
    expect(ids(filtrarChamados(ordenados, "dasa", "Todos"))).toEqual([1, 3]);
  });
});
