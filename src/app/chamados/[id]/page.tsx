import { ArrowLeft, CalendarDays, FileText, MapPin, Phone, Wrench } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AtendimentoForm } from "@/components/atendimento-form";
import { AssinaturasAtendimento } from "@/components/assinaturas-atendimento";
import { ExcluirChamado } from "@/components/excluir-chamado";
import { MarcarChamadoAcessado } from "@/components/marcar-chamado-acessado";
import { RatArquivoAcoes } from "@/components/rat-arquivo-acoes";
import { formatarCidade, formatarData, formatarDataHora, formatarMoeda } from "@/lib/format";
import { carregarComplementosChamado } from "@/lib/chamado-detalhe";
import { observeRequest } from "@/lib/db-observability";
import { nomeArquivoRat } from "@/lib/rat-arquivo";
import { ratService } from "@/lib/server-rat";
import { chamadosService } from "@/lib/server-service";
import { assinaturasService } from "@/lib/server-signatures";
import { statusEncerraAtendimento } from "@/lib/status";

export const dynamic = "force-dynamic";

function Dado({ rotulo, valor }: { rotulo: string; valor?: string | null }) {
  return <div className="data-item"><span>{rotulo}</span><strong>{valor || "—"}</strong></div>;
}

export default async function DetalheChamado({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const chamadoId = Number(id);
  if (!Number.isSafeInteger(chamadoId)) notFound();
  return observeRequest(`/chamados/${chamadoId}`, async () => {
    const chamado = await chamadosService.buscar(chamadoId);
    if (!chamado) notFound();
    const { assinaturaCliente, assinaturaTecnico, rats } = await carregarComplementosChamado({
      cliente: () => assinaturasService.buscarCliente(chamadoId),
      tecnico: () => assinaturasService.buscarTecnico(),
      rats: () => ratService.listar(chamadoId),
    });
    const numero = chamado.numero_chamado || `Chamado ${chamado.id}`;
    const encerrado = statusEncerraAtendimento(chamado.status);
    const ratAtual = rats.find((rat) => rat.atual) || rats[0];
    return (
    <main className={`page-shell detail-page${encerrado ? " detail-page-closed" : ""}`}>
      <MarcarChamadoAcessado id={chamado.id} />
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

      <AtendimentoForm key={`${chamado.id}-${chamado.hora_chegada}-${chamado.hora_inicio}-${chamado.hora_termino}`} chamado={chamado} />
      <AssinaturasAtendimento
        chamadoId={chamado.id}
        clienteInicial={assinaturaCliente}
        tecnicoInicial={assinaturaTecnico}
      />
      <section className="detail-card">
        <div className="section-heading"><span>05</span><div><h2>RAT</h2><p>Prepare, revise e gere a ordem de serviço em PDF.</p></div></div>
        {ratAtual ? <div className="rat-summary">
          <div><strong>RAT gerada</strong><span>Versão {ratAtual.versao}</span><span>Gerada em: {formatarDataHora(ratAtual.gerado_em)}</span></div>
          <RatArquivoAcoes chamadoId={chamado.id} ratId={ratAtual.id} nomeArquivo={nomeArquivoRat(numero, ratAtual.versao)} />
          <Link className="primary-button" href={`/chamados/${chamado.id}/rat`}><FileText size={17} />Gerar nova versão</Link>
        </div> : <div className="rat-summary">
          <p>Nenhuma RAT gerada.</p>
          <Link className="primary-button" href={`/chamados/${chamado.id}/rat`}><FileText size={17} />Preparar RAT</Link>
        </div>}
      </section>
      <section className="danger-zone">
        <ExcluirChamado id={chamado.id} numero={numero} />
      </section>
    </main>
    );
  });
}
