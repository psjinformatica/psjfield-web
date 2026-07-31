import { describe, expect, it } from "vitest";

import { interpretarEml } from "@/lib/parser";

function eml(corpo: string) {
  return new TextEncoder().encode(
    `From: Grupo Easy <operacoes@grupoeasy.example>\r\n` +
    `To: tecnico@example.invalid\r\n` +
    `Subject: Acionamento MI-285611-2\r\n` +
    `Date: Thu, 30 Jul 2026 10:00:00 -0300\r\n` +
    `Content-Type: text/plain; charset=utf-8\r\n\r\n${corpo}`,
  );
}

describe("interpretarEml", () => {
  it("porta os principais campos do parser Grupo Easy", async () => {
    const previa = await interpretarEml(eml(
      "CLIENTE: Claro\r\nPROJETO: Renovação\r\nDATA: 31/07/2026 às 14h\r\n" +
      "ENDEREÇO: Av Cândido de Abreu 127 Centro 80.530-900 Curitiba PR\r\n" +
      "EQUIPAMENTO: Desktop Lenovo M70q Serial: PE06HTER AE: 1221046\r\n" +
      "VALOR: R$ 100,00\r\nHORA ADICIONAL: R$ 30,00",
    ), "teste.eml");
    expect(previa.reconhecidoGrupoEasy).toBe(true);
    expect(previa.chamado.numero_chamado).toBe("MI-285611-2");
    expect(previa.chamado.cliente).toBe("Claro");
    expect(previa.chamado.data_agendada).toBe("2026-07-31");
    expect(previa.chamado.hora_agendada).toBe("14:00");
    expect(previa.chamado.cidade).toBe("Curitiba");
    expect(previa.chamado.estado).toBe("PR");
    expect(previa.chamado.valor_base).toBe("100");
    expect(previa.chamado.hash_email).toHaveLength(64);
    expect(previa.chamado.status).toBe("Agendado");
  });

  it("não classifica a intermediadora como cliente", async () => {
    const previa = await interpretarEml(eml("CLIENTE: Easytech"), "teste.eml");
    expect(previa.chamado.cliente).toBe("");
  });

  it("preserva somente metadados e corpo em e-mail genérico", async () => {
    const conteudo = new TextEncoder().encode(
      "From: cliente@example.invalid\r\nSubject: Pedido\r\nContent-Type: text/plain\r\n\r\nCLIENTE: Não extrair",
    );
    const previa = await interpretarEml(conteudo, "generico.eml");
    expect(previa.reconhecidoGrupoEasy).toBe(false);
    expect(previa.chamado.cliente).toBe("");
    expect(previa.chamado.corpo_email).toContain("CLIENTE");
    expect(previa.chamado.status).toBe("Agendado");
  });
});
