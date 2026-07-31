import { NextResponse } from "next/server";
import { ratService } from "@/lib/server-rat";

export async function GET(request: Request, { params }: { params: Promise<{ id: string; ratId: string }> }) {
  try {
    const { id, ratId } = await params;
    const { rat, bytes } = await ratService.baixar(Number(id), ratId);
    const download = new URL(request.url).searchParams.get("download") === "1";
    return new NextResponse(Buffer.from(bytes), { headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="RAT-v${rat.versao}.pdf"`,
      "Cache-Control": "private, no-store",
    } });
  } catch (erro) {
    return NextResponse.json({ erro: erro instanceof Error ? erro.message : "RAT não encontrada." }, { status: 404 });
  }
}
