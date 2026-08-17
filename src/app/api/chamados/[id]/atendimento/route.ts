import { NextResponse } from "next/server";

import { chamadosService } from "@/lib/server-service";
import { observeRequest } from "@/lib/db-observability";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return observeRequest(`/api/chamados/${id}/atendimento`, async () => {
    try {
      const resultado = await chamadosService.atualizar(Number(id), await request.json());
      return NextResponse.json({ sucesso: true, ...resultado });
    } catch (erro) {
      return NextResponse.json(
        { erro: erro instanceof Error ? erro.message : "Não foi possível salvar." },
        { status: 400 },
      );
    }
  });
}
