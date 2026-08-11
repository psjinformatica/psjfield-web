import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RatForm } from "@/components/rat-form";
import { buscarAssinaturaCliente } from "@/lib/assinaturas-repository";
import { mapearChamadoParaRat } from "@/lib/rat-mapper";
import { ratService } from "@/lib/server-rat";
import { chamadosService } from "@/lib/server-service";

export const dynamic = "force-dynamic";

export default async function PrepararRat({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const chamadoId = Number(id);
  if (!Number.isSafeInteger(chamadoId)) notFound();
  const chamado = await chamadosService.buscar(chamadoId);
  if (!chamado) notFound();
  const [cliente, versoes] = await Promise.all([buscarAssinaturaCliente(chamadoId), ratService.listar(chamadoId)]);
  const inicialMapeado = mapearChamadoParaRat(chamado, cliente);
  const inicial = versoes[0]?.dados_revisao
    ? { ...inicialMapeado, ...versoes[0].dados_revisao }
    : inicialMapeado;
  return <main className="page-shell detail-page">
    <Link className="back-link" href={`/chamados/${chamadoId}`}><ArrowLeft size={18} />Voltar ao chamado</Link>
    <header className="detail-header"><div><span className="eyebrow">RAT</span><h1>{chamado.numero_chamado}</h1><p>Revise os dados antes de gerar o documento oficial.</p></div></header>
    <RatForm chamadoId={chamadoId} status={chamado.status} inicial={inicial} versoes={versoes} />
  </main>;
}
