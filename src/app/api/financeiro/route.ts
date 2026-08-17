import { NextResponse } from "next/server";

import { financeiroService } from "@/lib/server-financeiro";
import { observeRequest } from "@/lib/db-observability";

export async function GET() {
  return observeRequest("/api/financeiro", async () => {
    try {
      return NextResponse.json(await financeiroService.listar());
    } catch (erro) {
      return NextResponse.json(
        { erro: erro instanceof Error ? erro.message : "Não foi possível consultar o financeiro." },
        { status: 500 },
      );
    }
  });
}
