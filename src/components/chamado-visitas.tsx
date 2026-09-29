import { CheckCircle2, Circle, FileText } from "lucide-react";
import Link from "next/link";

import { formatarData } from "@/lib/format";
import { rotuloVisita } from "@/lib/chamados-visitas";
import type { VisitaResumo } from "@/lib/types";

export function ChamadoVisitas({ atualId, visitas }: { atualId: number; visitas: VisitaResumo[] }) {
  if (visitas.length <= 1) return null;
  return <section className="detail-card visits-card" aria-labelledby="visitas-titulo">
    <div className="section-heading"><span>↕</span><div><h2 id="visitas-titulo">Visitas deste chamado</h2><p>Cada visita mantém atendimento, RAT e Financeiro independentes.</p></div></div>
    <div className="visits-list">
      {visitas.map((visita) => {
        const atual = visita.id === atualId;
        return <Link className={`visit-row${atual ? " visit-row-current" : ""}`} href={`/chamados/${visita.id}`} key={visita.id} aria-current={atual ? "page" : undefined}>
          {atual ? <CheckCircle2 aria-hidden="true" size={18} /> : <Circle aria-hidden="true" size={18} />}
          <span><strong>{rotuloVisita(visita.visita_numero)}</strong><small>{formatarData(visita.data_agendada) || "Sem data"} · {visita.hora_agendada || "--:--"}</small></span>
          <span className="visit-row-status">{visita.status}</span>
          {visita.quantidade_rats > 0 ? <span className="visit-row-rat"><FileText aria-hidden="true" size={14} /> RAT disponível{visita.quantidade_rats > 1 ? ` (${visita.quantidade_rats})` : ""}</span> : null}
        </Link>;
      })}
    </div>
  </section>;
}
