import { NextResponse } from "next/server";

import { financeiroService } from "@/lib/server-financeiro";

export async function GET() {
  try {
    return NextResponse.json(await financeiroService.listar());
  } catch (erro) {
    return NextResponse.json(
      { erro: erro instanceof Error ? erro.message : "Não foi possível consultar o financeiro." },
      { status: 500 },
    );
  }
}
