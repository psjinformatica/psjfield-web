import { NextResponse } from "next/server";

import { ConflitoCorrecaoFinanceiraError } from "@/lib/financeiro-correcao";
import { observeRequest } from "@/lib/db-observability";
import { financeiroService } from "@/lib/server-financeiro";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return observeRequest(`/api/financeiro/${id}/correcao`, async () => {
    try {
      const previa = await financeiroService.aplicarCorrecao(id, await request.json());
      return NextResponse.json({ ok: true, previa });
    } catch (erro) {
      return NextResponse.json(
        { erro: erro instanceof Error ? erro.message : "Não foi possível corrigir os parâmetros financeiros." },
        { status: erro instanceof ConflitoCorrecaoFinanceiraError ? 409 : 400 },
      );
    }
  });
}
