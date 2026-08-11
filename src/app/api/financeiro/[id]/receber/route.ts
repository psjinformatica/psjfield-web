import { NextResponse } from "next/server";

import { financeiroService } from "@/lib/server-financeiro";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await financeiroService.marcarRecebida(id, await request.json());
    return NextResponse.json({ ok: true });
  } catch (erro) {
    return NextResponse.json(
      { erro: erro instanceof Error ? erro.message : "Não foi possível registrar o recebimento." },
      { status: 400 },
    );
  }
}
