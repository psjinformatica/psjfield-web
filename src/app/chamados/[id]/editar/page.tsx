import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { EditarChamadoForm } from "@/components/editar-chamado-form";
import { observeRequest } from "@/lib/db-observability";
import { chamadosService } from "@/lib/server-service";
import { rotuloVisita } from "@/lib/chamados-visitas";

export const dynamic = "force-dynamic";

export default async function EditarChamado({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const chamadoId = Number(id);
  if (!Number.isSafeInteger(chamadoId) || chamadoId <= 0) notFound();
  return observeRequest(`/chamados/${chamadoId}/editar`, async () => {
    const contexto = await chamadosService.buscarContextoEdicao(chamadoId);
    if (!contexto) notFound();
    return <main className="page-shell detail-page edit-call-page">
      <Link className="back-link" href={`/chamados/${chamadoId}`}><ArrowLeft size={18} />Voltar ao chamado</Link>
      <header className="detail-header"><div>
        <span className="eyebrow">Editar dados do chamado</span>
        <h1>{contexto.chamado.numero_chamado || `Chamado ${chamadoId}`}</h1>
        <p>{contexto.chamado.cliente || "Cliente não informado"}{contexto.quantidade_visitas > 1 ? ` • ${rotuloVisita(contexto.chamado.visita_numero)}` : ""} · status permanece {contexto.chamado.status}</p>
      </div></header>
      <p className="edit-call-warning">Esta ação corrige somente o cadastro. Atendimento, status, RATs emitidas e Financeiro permanecem inalterados.</p>
      <EditarChamadoForm contexto={contexto} />
    </main>;
  });
}
