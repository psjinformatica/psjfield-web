import { NextResponse } from "next/server";
import { observeRequest } from "@/lib/db-observability";
import { nomeArquivoRat } from "@/lib/rat-arquivo";
import { ratService } from "@/lib/server-rat";

export async function GET(request: Request, { params }: { params: Promise<{ id: string; ratId: string }> }) {
  const { id, ratId } = await params;
  return observeRequest(`/api/chamados/${id}/rat/${ratId}/arquivo`, async () => {
    try {
      const { rat, chamado, bytes } = await ratService.baixar(Number(id), ratId);
      const download = new URL(request.url).searchParams.get("download") === "1";
      const nomeArquivo = nomeArquivoRat(chamado.numero_chamado, rat.versao);
      return new NextResponse(Buffer.from(bytes), { headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${nomeArquivo}"`,
        "Cache-Control": "private, no-store",
      } });
    } catch (erro) {
      return NextResponse.json({ erro: erro instanceof Error ? erro.message : "RAT não encontrada." }, { status: 404 });
    }
  });
}
