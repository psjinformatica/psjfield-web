import { NextResponse } from "next/server";

import { interpretarEml } from "@/lib/parser";
import { chamadosService } from "@/lib/server-service";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const arquivo = form.get("arquivo");
    if (!(arquivo instanceof File)) throw new Error("Selecione um arquivo .eml.");
    if (arquivo.size > 10 * 1024 * 1024) throw new Error("O arquivo excede o limite de 10 MB.");
    const previa = await interpretarEml(new Uint8Array(await arquivo.arrayBuffer()), arquivo.name);
    const duplicado = await chamadosService.buscarHash(previa.chamado.hash_email);
    return NextResponse.json({ ...previa, duplicado });
  } catch (erro) {
    return NextResponse.json(
      { erro: erro instanceof Error ? erro.message : "Não foi possível ler o e-mail." },
      { status: 400 },
    );
  }
}
