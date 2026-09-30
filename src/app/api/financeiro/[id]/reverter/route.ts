import { NextResponse } from "next/server";

import { observeRequest } from "@/lib/db-observability";
import { financeiroService } from "@/lib/server-financeiro";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return observeRequest(`/api/financeiro/${id}/reverter`, async () => {
    try {
      await financeiroService.reverterRecebimento(id);
      return NextResponse.json({ ok: true });
    } catch (erro) {
      return NextResponse.json(
        { erro: erro instanceof Error ? erro.message : "Não foi possível reverter o recebimento." },
        { status: 400 },
      );
    }
  });
}
