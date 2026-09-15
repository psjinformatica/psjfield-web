import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RatDasaForm } from "@/components/rat-dasa-form";
import { RatForm } from "@/components/rat-form";
import { buscarAssinaturaCliente, buscarAssinaturaTecnico } from "@/lib/assinaturas-repository";
import { observeRequest } from "@/lib/db-observability";
import { mapChamadoParaRatDasa } from "@/lib/rat-dasa-mapper";
import { chamadoSimulacaoRatDasa, criarSimulacaoRatDasa } from "@/lib/rat-dasa-simulation";
import { persistenciaDasaLocalHabilitada } from "@/lib/rat-local-environment";
import { mapearChamadoParaRat } from "@/lib/rat-mapper";
import {
  mensagemModeloRatIndisponivel,
  modeloRatImplementado,
  resolverModeloRat,
} from "@/lib/rat-models";
import { ratService } from "@/lib/server-rat";
import { chamadosService } from "@/lib/server-service";
import {
  ratCompativelComModelo,
  ultimaRevisaoClaroCompativel,
  ultimaRevisaoDasaCompativel,
} from "@/lib/rat-versioning";

export const dynamic = "force-dynamic";

export default async function PrepararRat({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ simulacao?: string }>;
}) {
  const { id } = await params;
  const consulta = await searchParams;
  const chamadoId = Number(id);
  if (!Number.isSafeInteger(chamadoId)) notFound();
  return observeRequest(`/chamados/${chamadoId}/rat`, async () => {
    const simulacaoDasa = process.env.NODE_ENV !== "production" && consulta.simulacao === "dasa-v1";
    const chamado = simulacaoDasa ? chamadoSimulacaoRatDasa : await chamadosService.buscar(chamadoId);
    if (!chamado) notFound();
    const modelo = resolverModeloRat(chamado);
    if (modelo === "dasa-v1") {
      const [inicialMapeado, versoes] = simulacaoDasa
        ? [criarSimulacaoRatDasa(), [] as Awaited<ReturnType<typeof ratService.listar>>]
        : await Promise.all([
          buscarAssinaturaTecnico().then((tecnico) => mapChamadoParaRatDasa(chamado, { tecnico })),
          ratService.listar(chamadoId),
        ]);
      const versoesDasa = versoes.filter((rat) => ratCompativelComModelo(rat, "dasa-v1"));
      const revisaoAnterior = ultimaRevisaoDasaCompativel(versoes);
      const inicial = revisaoAnterior ? {
        ...revisaoAnterior,
        cliente: {
          ...revisaoAnterior.cliente,
          assinatura_cliente: null,
        },
        tecnico: {
          ...revisaoAnterior.tecnico,
          nome_tecnico: inicialMapeado.tecnico.nome_tecnico,
          assinatura_tecnico: inicialMapeado.tecnico.assinatura_tecnico,
        },
      } : inicialMapeado;
      const homologacaoLocal = !simulacaoDasa && persistenciaDasaLocalHabilitada();
      return <main className="page-shell detail-page">
        <Link className="back-link" href={`/chamados/${chamadoId}`}><ArrowLeft size={18} />Voltar ao chamado</Link>
        <header className="detail-header"><div><span className="eyebrow">RAT DASA</span><h1>{chamado.numero_chamado}</h1><p>Prepare e confira uma prévia local antes de qualquer persistência.</p></div></header>
        {simulacaoDasa ? <p className="simulation-notice">Simulação local segura: nenhum dado do chamado 20 é consultado ou alterado.</p> : null}
        <RatDasaForm
          chamadoId={chamadoId}
          inicial={inicial}
          persistenciaLocal={homologacaoLocal}
          versoes={versoesDasa}
        />
      </main>;
    }
    if (!modeloRatImplementado(modelo)) {
      return <main className="page-shell detail-page">
        <Link className="back-link" href={`/chamados/${chamadoId}`}><ArrowLeft size={18} />Voltar ao chamado</Link>
        <header className="detail-header"><div><span className="eyebrow">RAT</span><h1>{chamado.numero_chamado}</h1></div></header>
        <section className="detail-card">
          <div className="section-heading"><span>RAT</span><div><h2>{mensagemModeloRatIndisponivel(modelo)}</h2><p>O formulário e o PDF deste modelo ainda não estão disponíveis.</p></div></div>
        </section>
      </main>;
    }
    const [cliente, versoes] = await Promise.all([buscarAssinaturaCliente(chamadoId), ratService.listar(chamadoId)]);
    const versoesClaro = versoes.filter((rat) => ratCompativelComModelo(rat, "claro-v1"));
    const inicialMapeado = mapearChamadoParaRat(chamado, cliente);
    const revisaoAnterior = ultimaRevisaoClaroCompativel(versoes);
    const inicial = revisaoAnterior
      ? { ...inicialMapeado, ...revisaoAnterior }
      : inicialMapeado;
    return <main className="page-shell detail-page">
    <Link className="back-link" href={`/chamados/${chamadoId}`}><ArrowLeft size={18} />Voltar ao chamado</Link>
    <header className="detail-header"><div><span className="eyebrow">RAT</span><h1>{chamado.numero_chamado}</h1><p>Revise os dados antes de gerar o documento oficial.</p></div></header>
    <RatForm chamadoId={chamadoId} status={chamado.status} inicial={inicial} versoes={versoesClaro} />
    </main>;
  });
}
