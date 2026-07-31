import { ArrowLeft, CalendarDays, MapPin, Phone, Wrench } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AtendimentoForm } from "@/components/atendimento-form";
import { ExcluirChamado } from "@/components/excluir-chamado";
import { formatarCidade, formatarData, formatarMoeda } from "@/lib/format";
import { chamadosService } from "@/lib/server-service";

export const dynamic = "force-dynamic";

function Dado({ rotulo, valor }: { rotulo: string; valor?: string | null }) {
  return <div className="data-item"><span>{rotulo}</span><strong>{valor || "—"}</strong></div>;
}

export default async function DetalheChamado({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const chamadoId = Number(id);
  if (!Number.isSafeInteger(chamadoId)) notFound();
  const chamado = await chamadosService.buscar(chamadoId);
  if (!chamado) notFound();
  const numero = chamado.numero_chamado || `Chamado ${chamado.id}`;
  return (
    <main className="page-shell detail-page">
      <Link className="back-link" href="/"><ArrowLeft size={18} /> Voltar aos chamados</Link>
      <header className="detail-header">
        <div>
          <span className={`status status-${chamado.status.toLocaleLowerCase("pt-BR").replaceAll(" ", "-")}`}>{chamado.status}</span>
          <h1>{numero}</h1>
          <p>{chamado.cliente || "Cliente não informado"}{chamado.projeto ? ` · ${chamado.projeto}` : ""}</p>
        </div>
        {chamado.valor_base && <strong className="detail-price">{formatarMoeda(chamado.valor_base)}</strong>}
      </header>

      <section className="detail-card">
        <div className="section-heading"><span>01</span><div><h2>Dados do chamado</h2><p>Informações recebidas no acionamento.</p></div></div>
        <div className="quick-facts">
          <div><CalendarDays /><span>{formatarData(chamado.data_agendada) || "Sem data"}<small>{chamado.hora_agendada || "Sem horário"}</small></span></div>
          <div><MapPin /><span>{formatarCidade(chamado.cidade, chamado.estado) || "Cidade não informada"}<small>{chamado.endereco || "Endereço não informado"}</small></span></div>
          <div><Phone /><span>{chamado.contato || "Contato não informado"}<small>{chamado.telefone || "Telefone não informado"}</small></span></div>
        </div>
        <div className="data-grid">
          <Dado rotulo="Cliente" valor={chamado.cliente} />
          <Dado rotulo="Projeto" valor={chamado.projeto} />
          <Dado rotulo="Atividade" valor={chamado.atividade} />
          <Dado rotulo="Observações" valor={chamado.observacoes} />
        </div>
      </section>

      <section className="detail-card">
        <div className="section-heading"><span>02</span><div><h2>Equipamento</h2><p>Identificação do ativo atendido.</p></div></div>
        <div className="equipment-title"><Wrench size={20} />{chamado.equipamento || "Equipamento não informado"}</div>
        <div className="data-grid compact">
          <Dado rotulo="Fabricante" valor={chamado.fabricante} />
          <Dado rotulo="Modelo" valor={chamado.modelo} />
          <Dado rotulo="Número de série" valor={chamado.numero_serie} />
          <Dado rotulo="AE" valor={chamado.patrimonio_ae} />
        </div>
      </section>

      <AtendimentoForm chamado={chamado} />
      <section className="danger-zone">
        <ExcluirChamado id={chamado.id} numero={numero} />
      </section>
    </main>
  );
}
