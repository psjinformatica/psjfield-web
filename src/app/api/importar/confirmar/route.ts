import { NextResponse } from "next/server";

import { validarRevisaoImportacao } from "@/lib/importacao-campos";
import { interpretarEml } from "@/lib/parser";
import { chamadosService } from "@/lib/server-service";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const arquivo = form.get("arquivo");
    if (!(arquivo instanceof File)) throw new Error("Arquivo .eml não informado.");
    if (arquivo.size > 10 * 1024 * 1024) throw new Error("O arquivo excede o limite de 10 MB.");
    const previa = await interpretarEml(new Uint8Array(await arquivo.arrayBuffer()), arquivo.name);
    const dados = JSON.parse(String(form.get("dados") || "{}")) as Record<string, unknown>;
    const revisado = validarRevisaoImportacao(previa.chamado, dados);
    revisado.status = "Agendado";
    revisado.atualizado_em = new Date().toISOString();
    const id = await chamadosService.importar(revisado, arquivo.name);
    return NextResponse.json({ id });
  } catch (erro) {
    const mensagem = erro instanceof Error ? erro.message : "Não foi possível importar.";
    const status = mensagem.includes("já foi importado") ? 409 : 400;
    return NextResponse.json({ erro: mensagem }, { status });
  }
}
