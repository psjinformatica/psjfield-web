import { gerarRatDasaPdf } from "@/lib/rat-dasa-pdf";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const dados = await request.json();
    const bytes = await gerarRatDasaPdf(dados);
    return new Response(Buffer.from(bytes), {
      status: 200,
      headers: {
        "Cache-Control": "no-store",
        "Content-Disposition": "inline; filename=RAT_DASA_PREVIEW.pdf",
        "Content-Type": "application/pdf",
      },
    });
  } catch (erro) {
    return Response.json(
      { erro: erro instanceof Error ? erro.message : "Não foi possível gerar a prévia da RAT DASA." },
      { status: 400 },
    );
  }
}
