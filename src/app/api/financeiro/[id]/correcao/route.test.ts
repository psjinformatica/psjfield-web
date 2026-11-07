import { beforeEach, describe, expect, it, vi } from "vitest";

const dependencias = vi.hoisted(() => ({ preparar: vi.fn(), aplicar: vi.fn() }));
vi.mock("@/lib/server-financeiro", () => ({
  financeiroService: { prepararCorrecao: dependencias.preparar, aplicarCorrecao: dependencias.aplicar },
}));
vi.mock("@/lib/db-observability", () => ({ observeRequest: (_r: string, op: () => unknown) => op() }));

import { POST as aplicar } from "@/app/api/financeiro/[id]/correcao/route";
import { POST as preparar } from "@/app/api/financeiro/[id]/correcao/previa/route";
import { ConflitoCorrecaoFinanceiraError } from "@/lib/financeiro-correcao";

const id = "8e84b693-e79d-41b5-9e27-ce087109bd18";

describe("API de correção financeira", () => {
  beforeEach(() => vi.clearAllMocks());

  it("encaminha a prévia e a confirmação ao serviço", async () => {
    dependencias.preparar.mockResolvedValueOnce({ versao: "a".repeat(64) });
    const entrada = { parametros: { valor_base: 130, horas_incluidas: 3, valor_hora_adicional: 30 } };
    const respostaPrevia = await preparar(new Request("http://local", { method: "POST", body: JSON.stringify(entrada) }), { params: Promise.resolve({ id }) });
    expect(respostaPrevia.status).toBe(200);
    expect(dependencias.preparar).toHaveBeenCalledWith(id, entrada);

    dependencias.aplicar.mockResolvedValueOnce({ versao: "a".repeat(64) });
    const confirmacao = { ...entrada, motivo: "Ajuste autorizado", confirmado: true, versao: "a".repeat(64) };
    const resposta = await aplicar(new Request("http://local", { method: "POST", body: JSON.stringify(confirmacao) }), { params: Promise.resolve({ id }) });
    expect(resposta.status).toBe(200);
    expect(dependencias.aplicar).toHaveBeenCalledWith(id, confirmacao);
  });

  it("retorna 409 para concorrência ou recebível inelegível", async () => {
    dependencias.aplicar.mockRejectedValueOnce(new ConflitoCorrecaoFinanceiraError());
    const resposta = await aplicar(new Request("http://local", { method: "POST", body: "{}" }), { params: Promise.resolve({ id }) });
    expect(resposta.status).toBe(409);
  });
});
