import { describe, expect, it } from "vitest";

import { persistenciaDasaLocalHabilitada } from "@/lib/rat-local-environment";

const local = {
  NODE_ENV: "development",
  RAT_DASA_LOCAL_PERSISTENCE: "1",
  DATABASE_URL: "postgresql://postgres:postgres@127.0.0.1:54322/postgres",
  SUPABASE_URL: "http://localhost:54321",
} as NodeJS.ProcessEnv;

describe("persistência DASA local", () => {
  it("habilita somente com flag, banco local e Supabase local", () => {
    expect(persistenciaDasaLocalHabilitada(local)).toBe(true);
  });

  it.each([
    { ...local, RAT_DASA_LOCAL_PERSISTENCE: "0" },
    { ...local, NODE_ENV: "production" },
    { ...local, DATABASE_URL: "postgresql://host-remoto/banco" },
    { ...local, SUPABASE_URL: "https://projeto.supabase.co" },
  ])("bloqueia ambiente não estritamente local", (ambiente) => {
    expect(persistenciaDasaLocalHabilitada(ambiente)).toBe(false);
  });
});
