import { NextResponse } from "next/server";

import { chamadosService } from "@/lib/server-service";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const resultado = await chamadosService.finalizar(Number(id), await request.json());
    return NextResponse.json(resultado);
  } catch (erro) {
    return NextResponse.json(
      { erro: erro instanceof Error ? erro.message : "Não foi possível finalizar." },
      { status: 400 },
    );
  }
}
