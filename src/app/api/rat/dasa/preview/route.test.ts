import { readFile } from "node:fs/promises";

import { beforeEach, describe, expect, it, vi } from "vitest";

const gerarRatDasaPdf = vi.hoisted(() => vi.fn());

vi.mock("@/lib/rat-dasa-pdf", () => ({ gerarRatDasaPdf }));

import { POST } from "@/app/api/rat/dasa/preview/route";

describe("POST /api/rat/dasa/preview", () => {
  beforeEach(() => gerarRatDasaPdf.mockReset());

  it("gera bytes temporários sem qualquer dependência de persistência", async () => {
    gerarRatDasaPdf.mockResolvedValue(Uint8Array.from([37, 80, 68, 70]));
    const dados = { modelo: "dasa-v1" };
    const resposta = await POST(new Request("http://localhost/api/rat/dasa/preview", {
      method: "POST",
      body: JSON.stringify(dados),
    }));

    expect(resposta.status).toBe(200);
    expect(resposta.headers.get("content-type")).toBe("application/pdf");
    expect(resposta.headers.get("cache-control")).toBe("no-store");
    expect(gerarRatDasaPdf).toHaveBeenCalledWith(dados);
  });

  it("não importa repository, serviço de versões, storage ou atualização de chamado", async () => {
    const fonte = await readFile(new URL("./route.ts", import.meta.url), "utf8");

    expect(fonte).not.toMatch(/repository|server-rat|rat-storage|server-service|atualizar/i);
    expect(fonte).toContain("gerarRatDasaPdf");
  });

  it("retorna erro controlado sem persistir quando a validação falha", async () => {
    const resposta = await POST(new Request("http://localhost/api/rat/dasa/preview", {
      method: "POST",
      body: "{json-invalido",
    }));

    expect(resposta.status).toBe(400);
    await expect(resposta.json()).resolves.toEqual({ erro: expect.any(String) });
    expect(gerarRatDasaPdf).not.toHaveBeenCalled();
  });
});
