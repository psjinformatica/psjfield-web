import { NextResponse } from "next/server";

import { chamadosService } from "@/lib/server-service";
import { observeRequest } from "@/lib/db-observability";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return observeRequest(`/api/chamados/${id}/reabrir`, async () => {
    try {
      const resultado = await chamadosService.reabrir(Number(id), await request.json());
      return NextResponse.json(resultado);
    } catch (erro) {
      return NextResponse.json(
        { erro: erro instanceof Error ? erro.message : "Não foi possível reabrir o atendimento." },
        { status: 400 },
      );
    }
  });
}
