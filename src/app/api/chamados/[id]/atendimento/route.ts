import { NextResponse } from "next/server";

import { chamadosService } from "@/lib/server-service";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    await chamadosService.atualizar(Number(id), await request.json());
    return NextResponse.json({ sucesso: true });
  } catch (erro) {
    return NextResponse.json(
      { erro: erro instanceof Error ? erro.message : "Não foi possível salvar." },
      { status: 400 },
    );
  }
}
