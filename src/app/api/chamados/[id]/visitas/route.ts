import { NextResponse } from "next/server";

import { observeRequest } from "@/lib/db-observability";
import { chamadosService } from "@/lib/server-service";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return observeRequest(`/api/chamados/${id}/visitas`, async () => {
    try {
      const visita = await chamadosService.criarVisita(Number(id), await request.json());
      return NextResponse.json(visita, { status: 201 });
    } catch (erro) {
      return NextResponse.json(
        { erro: erro instanceof Error ? erro.message : "Não foi possível agendar a nova visita." },
        { status: 400 },
      );
    }
  });
}
