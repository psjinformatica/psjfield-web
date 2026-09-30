import { describe, expect, it } from "vitest";

import { extrairNumeroChamado, numeroChamadoValido } from "@/lib/chamado-numero";

describe("número externo do chamado", () => {
  it.each(["MI-123", "MI-123-2", "SR-123", "SR-123-2", "INC-924376"])(
    "aceita o formato comprovado %s",
    (numero) => expect(numeroChamadoValido(numero)).toBe(true),
  );

  it.each(["INC-", "INC-924376-2", "INC 924376", "DASA-924376"])(
    "não amplia INC além da evidência disponível: %s",
    (numero) => expect(numeroChamadoValido(numero)).toBe(false),
  );

  it("extrai INC mesmo quando o valor vem precedido por cerquilha", () => {
    expect(extrairNumeroChamado("#inc-924376")).toBe("INC-924376");
    expect(extrairNumeroChamado("#INC-924376-2")).toBe("");
  });
});
