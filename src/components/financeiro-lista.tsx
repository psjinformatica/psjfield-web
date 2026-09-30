"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays } from "lucide-react";

import { formatarData, formatarMoeda } from "@/lib/format";
import type { ContaReceber } from "@/lib/financeiro-types";
import { exibirIdentificacaoVisita, rotuloVisita } from "@/lib/chamados-visitas";

export function filtrarContasFinanceiro(contas: ContaReceber[], filtro: string) {
  return contas.filter((conta) => filtro === "TODOS" || conta.situacao === filtro);
}

export function identificacaoVisitaFinanceiro(conta: Pick<ContaReceber, "visita_numero" | "quantidade_visitas">) {
  return exibirIdentificacaoVisita(conta.quantidade_visitas)
    ? rotuloVisita(conta.visita_numero ?? 1)
    : null;
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

export function podeReverterRecebimento(conta: Pick<ContaReceber, "situacao">) {
  return conta.situacao === "RECEBIDO";
}

type RespostaReversao = Pick<Response, "ok" | "json">;
type SolicitarReversao = (url: string, opcoes: RequestInit) => Promise<RespostaReversao>;

export async function solicitarReversaoRecebimento(
  id: string,
  confirmado: boolean,
  solicitar: SolicitarReversao = fetch,
) {
  if (!confirmado) return false;
  const resposta = await solicitar(`/api/financeiro/${id}/reverter`, { method: "POST" });
  const dados = await resposta.json();
  if (!resposta.ok) throw new Error(dados.erro || "Não foi possível reverter o recebimento.");
  return true;
}

export function ConfirmacaoReversaoRecebimento({
  desabilitada,
  onCancelar,
  onConfirmar,
}: {
  desabilitada: boolean;
  onCancelar: () => void;
  onConfirmar: () => void;
}) {
  return <section aria-labelledby="titulo-reversao-recebimento" className="receive-reversal-confirm" role="alertdialog">
    <strong id="titulo-reversao-recebimento">Reverter recebimento?</strong>
    <p>Este chamado voltará para contas a receber e os dados do recebimento registrado serão removidos.</p>
    <p>O atendimento original não será alterado.</p>
    <div>
      <button className="secondary-button" disabled={desabilitada} onClick={onCancelar} type="button">Cancelar</button>
      <button className="danger-button" disabled={desabilitada} onClick={onConfirmar} type="button">Reverter recebimento</button>
    </div>
  </section>;
}

export function FinanceiroLista({ contas }: { contas: ContaReceber[] }) {
  const router = useRouter();
  const [filtro, setFiltro] = useState("TODOS");
  const [pendente, setPendente] = useState<string>();
  const [confirmandoReversao, setConfirmandoReversao] = useState<string>();
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

  async function reverter(conta: ContaReceber) {
    setPendente(conta.id);
    setErro("");
    try {
      await solicitarReversaoRecebimento(conta.id, true);
      setConfirmandoReversao(undefined);
      router.refresh();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível reverter o recebimento.");
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
      {filtradas.map((conta) => {
        const visita = identificacaoVisitaFinanceiro(conta);
        return <article className="finance-card" key={conta.id}>
        <div className="finance-card-head"><div><span>Chamado</span><strong>{conta.numero_chamado}</strong>{visita ? <small>{visita}</small> : null}</div><span className={`finance-status finance-${conta.situacao.toLowerCase()}`}>{conta.rotulo_situacao}</span></div>
        <dl>{indicadoresContaFinanceiro(conta).map((indicador) => (
          <div key={indicador.rotulo}><dt>{indicador.rotulo}</dt><dd>{indicador.valor}</dd></div>
        ))}</dl>
        {conta.revisao_pendente && <p className="finance-review">Revisão pendente</p>}
        {conta.situacao !== "RECEBIDO" && !conta.revisao_pendente && conta.valor_total && <form action={(dados) => receber(conta, dados)} className="receive-form">
          <label>Data recebida<input name="recebido_em" type="date" required /></label>
          <label>Valor recebido<span className="currency-input"><span>R$</span><input defaultValue={conta.valor_total} min="0.01" name="valor_recebido" step="0.01" type="number" required /></span></label>
          <button className="primary-button" disabled={pendente === conta.id}>Marcar como recebido</button>
        </form>}
        {podeReverterRecebimento(conta) && confirmandoReversao !== conta.id && <button
          className="secondary-button receive-reversal-button"
          disabled={pendente === conta.id}
          onClick={() => setConfirmandoReversao(conta.id)}
          type="button"
        >Reverter recebimento</button>}
        {podeReverterRecebimento(conta) && confirmandoReversao === conta.id && <ConfirmacaoReversaoRecebimento
          desabilitada={pendente === conta.id}
          onCancelar={() => setConfirmandoReversao(undefined)}
          onConfirmar={() => void reverter(conta)}
        />}
      </article>;
      })}
    </div>
  </>;
}
