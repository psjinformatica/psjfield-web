import { chamadosService } from "@/lib/server-service";
import { ChamadosLista } from "@/components/chamados-lista";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const chamados = await chamadosService.listar();
  return (
    <main className="page-shell">
      <section className="hero">
        <div>
          <p className="eyebrow">Operação em campo</p>
          <h1>Chamados</h1>
          <p className="hero-copy">
            Acompanhe a agenda, encontre atendimentos e registre o trabalho em poucos toques.
          </p>
        </div>
        <div className="metric">
          <strong>{chamados.length}</strong>
          <span>{chamados.length === 1 ? "chamado" : "chamados"}</span>
        </div>
      </section>
      <ChamadosLista chamados={chamados} />
    </main>
  );
}
