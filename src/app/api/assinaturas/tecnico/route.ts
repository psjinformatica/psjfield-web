import { NextResponse } from "next/server";

import { assinaturasService } from "@/lib/server-signatures";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const arquivo = form.get("assinatura");
    if (!(arquivo instanceof File)) throw new Error("Faça a assinatura antes de confirmar.");
    const bytes = new Uint8Array(await arquivo.arrayBuffer());
    return NextResponse.json(await assinaturasService.salvarTecnico({
      nome_tecnico: String(form.get("nome_tecnico") || ""),
      arquivo: { bytes, tipo: arquivo.type, tamanho: arquivo.size },
    }));
  } catch (erro) {
    return NextResponse.json(
      { erro: erro instanceof Error ? erro.message : "Não foi possível salvar a assinatura." },
      { status: 400 },
    );
  }
}
