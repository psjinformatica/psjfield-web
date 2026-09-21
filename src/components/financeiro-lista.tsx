"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays } from "lucide-react";

import { formatarData, formatarMoeda } from "@/lib/format";
import type { ContaReceber } from "@/lib/financeiro-types";

export function filtrarContasFinanceiro(contas: ContaReceber[], filtro: string) {
  return contas.filter((conta) => filtro === "TODOS" || conta.situacao === filtro);
}

export function indicadoresContaFinanceiro(conta: ContaReceber) {
  const valorPrincipal = conta.situacao === "RECEBIDO" ? conta.valor_recebido : conta.valor_total;
  return [
    { rotulo: "Valor", valor: valorPrincipal ? formatarMoeda(valorPrincipal) : "Pendente de cálculo" },
    conta.situacao === "RECEBIDO"
      ? { rotulo: "Recebido em", valor: formatarData(conta.recebido_em || "") }
      : { rotulo: "Previsão", valor: formatarData(conta.previsao_recebimento) },
    {
      rotulo: "Duração",
      valor: conta.duracao_minutos === null
        ? "Revisão necessária"
        : `${Math.floor(conta.duracao_minutos / 60)}h${String(conta.duracao_minutos % 60).padStart(2, "0")}`,
    },
    { rotulo: "Origem", valor: conta.origem === "AUTOMATICO" ? "Automático" : "Histórico manual" },
  ];
}

export function FinanceiroLista({ contas }: { contas: ContaReceber[] }) {
  const router = useRouter();
  const [filtro, setFiltro] = useState("TODOS");
  const [pendente, setPendente] = useState<string>();
  const [erro, setErro] = useState("");
  const filtradas = useMemo(
    () => filtrarContasFinanceiro(contas, filtro),
    [contas, filtro],
  );

  async function receber(conta: ContaReceber, formulario: FormData) {
    setPendente(conta.id);
    setErro("");
    try {
      const resposta = await fetch(`/api/financeiro/${conta.id}/receber`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          valor_recebido: formulario.get("valor_recebido"),
          recebido_em: formulario.get("recebido_em"),
        }),
      });
      const dados = await resposta.json();
      if (!resposta.ok) throw new Error(dados.erro);
      router.refresh();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível registrar o recebimento.");
    } finally {
      setPendente(undefined);
    }
  }

  if (!contas.length) return <div className="empty-state"><h3>Nenhum valor a receber.</h3><p>Novos recebíveis serão criados ao finalizar chamados elegíveis.</p></div>;

  return <>
    <div className="finance-filters">
      <label>Situação
        <select value={filtro} onChange={(evento) => setFiltro(evento.target.value)}>
          <option value="TODOS">Todas</option><option value="A_RECEBER">A receber</option>
          <option value="EM_REVISAO">Em revisão</option><option value="RECEBIDO">Recebido</option>
        </select>
      </label>
      <p className="finance-order-hint"><CalendarDays aria-hidden="true" size={14} /> Ordenado pela previsão (mais próxima primeiro)</p>
    </div>
    {erro && <p className="feedback error" role="alert">{erro}</p>}
    <div className="finance-grid">
      {filtradas.map((conta) => <article className="finance-card" key={conta.id}>
        <div className="finance-card-head"><div><span>Chamado</span><strong>{conta.numero_chamado}</strong></div><span className={`finance-status finance-${conta.situacao.toLowerCase()}`}>{conta.rotulo_situacao}</span></div>
        <dl>{indicadoresContaFinanceiro(conta).map((indicador) => (
          <div key={indicador.rotulo}><dt>{indicador.rotulo}</dt><dd>{indicador.valor}</dd></div>
        ))}</dl>
        {conta.revisao_pendente && <p className="finance-review">Revisão pendente</p>}
        {conta.situacao !== "RECEBIDO" && !conta.revisao_pendente && conta.valor_total && <form action={(dados) => receber(conta, dados)} className="receive-form">
          <label>Data recebida<input name="recebido_em" type="date" required /></label>
          <label>Valor recebido<span className="currency-input"><span>R$</span><input defaultValue={conta.valor_total} min="0.01" name="valor_recebido" step="0.01" type="number" required /></span></label>
          <button className="primary-button" disabled={pendente === conta.id}>Marcar como recebido</button>
        </form>}
      </article>)}
    </div>
  </>;
}
