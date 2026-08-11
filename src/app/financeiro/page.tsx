import { CircleDollarSign } from "lucide-react";

import { FinanceiroLista } from "@/components/financeiro-lista";
import { financeiroService } from "@/lib/server-financeiro";

export const dynamic = "force-dynamic";

export default async function FinanceiroPage() {
  const contas = await financeiroService.listar();
  const total = contas.filter((conta) => conta.situacao !== "RECEBIDO").reduce((soma, conta) => soma + Number(conta.valor_total || 0), 0);
  return <main className="page-shell">
    <section className="hero compact-hero"><div><p className="eyebrow">Controle financeiro</p><h1>A Receber</h1><p className="hero-copy">Valores calculados a partir dos atendimentos encerrados.</p></div><div className="metric"><CircleDollarSign /><strong>{total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</strong><span>em aberto</span></div></section>
    <FinanceiroLista contas={contas} />
  </main>;
}
