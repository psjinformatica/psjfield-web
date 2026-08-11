import { ArrowLeft, ExternalLink } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { RatArquivoAcoes } from "@/components/rat-arquivo-acoes";
import { nomeArquivoRat } from "@/lib/rat-arquivo";
import { ratService } from "@/lib/server-rat";
import { chamadosService } from "@/lib/server-service";

export const dynamic = "force-dynamic";

export default async function VisualizarRat({ params }: { params: Promise<{ id: string; ratId: string }> }) {
  const { id, ratId } = await params;
  const chamadoId = Number(id);
  if (!Number.isSafeInteger(chamadoId)) notFound();
  const [chamado, versoes] = await Promise.all([chamadosService.buscar(chamadoId), ratService.listar(chamadoId)]);
  const rat = versoes.find((item) => item.id === ratId);
  if (!chamado || !rat) notFound();
  const arquivoUrl = `/api/chamados/${chamadoId}/rat/${ratId}/arquivo`;
  const nomeArquivo = nomeArquivoRat(chamado.numero_chamado, rat.versao);
  return <main className="page-shell rat-viewer-page">
    <Link className="back-link" href={`/chamados/${chamadoId}`}><ArrowLeft size={18} />Voltar ao chamado</Link>
    <header className="rat-viewer-header">
      <div><span className="eyebrow">RAT · Versão {rat.versao}</span><h1>{chamado.numero_chamado}</h1></div>
      <RatArquivoAcoes chamadoId={chamadoId} ratId={ratId} nomeArquivo={nomeArquivo} visualizarEmRota={false} />
    </header>
    <p className="rat-mobile-hint">Se a prévia não abrir no PWA, use <a target="_blank" rel="noreferrer" href={arquivoUrl}><ExternalLink size={15} />Abrir PDF no navegador</a>.</p>
    <iframe className="rat-pdf-frame" src={arquivoUrl} title={`Visualização de ${nomeArquivo}`} />
  </main>;
}
