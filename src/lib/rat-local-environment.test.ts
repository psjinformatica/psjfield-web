import { describe, expect, it } from "vitest";

import { persistenciaDasaHabilitada } from "@/lib/rat-local-environment";

describe("autorização explícita da persistência DASA", () => {
  it("fica desabilitada por padrão", () => {
    expect(persistenciaDasaHabilitada({} as NodeJS.ProcessEnv)).toBe(false);
  });

  it("habilita somente com o valor exato 1", () => {
    expect(persistenciaDasaHabilitada({ RAT_DASA_PERSISTENCE_ENABLED: "1" } as NodeJS.ProcessEnv)).toBe(true);
  });

  it.each(["", "0", "true", " 1", "1 "])("bloqueia o valor inválido %j", (valor) => {
    expect(persistenciaDasaHabilitada({ RAT_DASA_PERSISTENCE_ENABLED: valor } as NodeJS.ProcessEnv)).toBe(false);
  });
});
