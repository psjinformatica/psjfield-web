import { NextResponse } from "next/server";
import { ratService } from "@/lib/server-rat";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const corpo = await request.json();
    const rat = await ratService.gerarRat(Number(id), corpo.dados, corpo.confirmar_cancelado === true);
    return NextResponse.json(rat, { status: 201 });
  } catch (erro) {
    return NextResponse.json({ erro: erro instanceof Error ? erro.message : "Não foi possível gerar a RAT." }, { status: 400 });
  }
}
