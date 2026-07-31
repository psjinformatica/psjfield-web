import { NextResponse } from "next/server";

import { assinaturasService } from "@/lib/server-signatures";

export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const form = await request.formData();
    const arquivo = form.get("assinatura");
    if (!(arquivo instanceof File)) throw new Error("Faça a assinatura antes de confirmar.");
    const bytes = new Uint8Array(await arquivo.arrayBuffer());
    const assinatura = await assinaturasService.salvarCliente(Number(id), {
      nome_responsavel: String(form.get("nome_responsavel") || ""),
      documento_responsavel: String(form.get("documento_responsavel") || ""),
      arquivo: { bytes, tipo: arquivo.type, tamanho: arquivo.size },
    });
    return NextResponse.json(assinatura);
  } catch (erro) {
    return NextResponse.json(
      { erro: erro instanceof Error ? erro.message : "Não foi possível salvar a assinatura." },
      { status: 400 },
    );
  }
}
