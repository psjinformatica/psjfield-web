import { describe, expect, it } from "vitest";

import { horarioAtualSaoPaulo, statusEncerraAtendimento, statusGeraRecebimento } from "@/lib/status";

describe("regras centralizadas de status", () => {
  it.each(["Concluído", "Improdutivo", "Cancelado"])("%s encerra o atendimento", (status) => {
    expect(statusEncerraAtendimento(status)).toBe(true);
  });

  it.each(["Agendado", "Em atendimento"])("%s mantém o atendimento aberto", (status) => {
    expect(statusEncerraAtendimento(status)).toBe(false);
  });

  it("gera recebimento somente para concluído e improdutivo", () => {
    expect(statusGeraRecebimento("Concluído")).toBe(true);
    expect(statusGeraRecebimento("Improdutivo")).toBe(true);
    expect(statusGeraRecebimento("Cancelado")).toBe(false);
  });

  it("calcula o horário atual no fuso de São Paulo", () => {
    expect(horarioAtualSaoPaulo(new Date("2026-08-01T15:34:00Z"))).toBe("12:34");
  });
});
