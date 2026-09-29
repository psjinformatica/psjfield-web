import { NextResponse } from "next/server";

import { ConflitoEdicaoChamadoError } from "@/lib/chamados-edicao";
import { observeRequest } from "@/lib/db-observability";
import { chamadosService } from "@/lib/server-service";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return observeRequest(`/api/chamados/${id}/dados`, async () => {
    try {
      const resultado = await chamadosService.editarDados(Number(id), await request.json());
      return NextResponse.json(resultado);
    } catch (erro) {
      return NextResponse.json(
        { erro: erro instanceof Error ? erro.message : "Não foi possível editar o chamado." },
        { status: erro instanceof ConflitoEdicaoChamadoError ? 409 : 400 },
      );
    }
  });
}
