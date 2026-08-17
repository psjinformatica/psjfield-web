import { NextResponse } from "next/server";

import { financeiroService } from "@/lib/server-financeiro";
import { observeRequest } from "@/lib/db-observability";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return observeRequest(`/api/financeiro/${id}/receber`, async () => {
    try {
      await financeiroService.marcarRecebida(id, await request.json());
      return NextResponse.json({ ok: true });
    } catch (erro) {
      return NextResponse.json(
        { erro: erro instanceof Error ? erro.message : "Não foi possível registrar o recebimento." },
        { status: 400 },
      );
    }
  });
}
