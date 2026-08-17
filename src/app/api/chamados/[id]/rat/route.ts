import { NextResponse } from "next/server";
import { observeRequest } from "@/lib/db-observability";
import { ratService } from "@/lib/server-rat";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return observeRequest(`/api/chamados/${id}/rat`, async () => {
    try {
      const corpo = await request.json();
      const rat = await ratService.gerarRat(Number(id), corpo.dados, corpo.confirmar_cancelado === true);
      return NextResponse.json(rat, { status: 201 });
    } catch (erro) {
      return NextResponse.json({ erro: erro instanceof Error ? erro.message : "Não foi possível gerar a RAT." }, { status: 400 });
    }
  });
}
