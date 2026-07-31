import { describe, expect, it } from "vitest";

import { formatarDataRelativa } from "@/lib/format";

describe("formatarDataRelativa", () => {
  const referencia = new Date(2026, 6, 31, 12);

  it("mostra Hoje e Amanhã quando aplicável", () => {
    expect(formatarDataRelativa("2026-07-31", referencia)).toBe("Hoje");
    expect(formatarDataRelativa("2026-08-01", referencia)).toBe("Amanhã");
  });

  it("mantém a data completa nos demais dias", () => {
    expect(formatarDataRelativa("2026-08-02", referencia)).toBe("02/08/2026");
  });
});
