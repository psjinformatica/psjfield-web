"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { formatarData, formatarMoeda } from "@/lib/format";
import type { PreviaCorrecaoFinanceira } from "@/lib/financeiro-correcao";
import type { ContaReceber } from "@/lib/financeiro-types";

export function podeCorrigirParametrosFinanceiros(
  conta: Pick<ContaReceber, "situacao" | "revisao_pendente" | "valor_total">,
) {
  return conta.situacao === "A_RECEBER" && !conta.revisao_pendente && conta.valor_total !== null;
}

type RespostaApi = Pick<Response, "ok" | "status" | "json">;
type Solicitar = (url: string, opcoes: RequestInit) => Promise<RespostaApi>;

export async function solicitarPreviaCorrecaoFinanceira(
  id: string,
  parametros: Record<string, string>,
  solicitar: Solicitar = fetch,
) {
  const resposta = await solicitar(`/api/financeiro/${id}/correcao/previa`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ parametros }),
  });
  const dados = await resposta.json();
  if (!resposta.ok) throw new Error(dados.erro || "Não foi possível calcular a prévia.");
  return dados as PreviaCorrecaoFinanceira;
}

export async function solicitarCorrecaoFinanceira(
  id: string,
  previa: PreviaCorrecaoFinanceira,
  parametros: Record<string, string>,
  motivo: string,
  solicitar: Solicitar = fetch,
) {
  const resposta = await solicitar(`/api/financeiro/${id}/correcao`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ parametros, motivo, confirmado: true, versao: previa.versao }),
  });
  const dados = await resposta.json();
  if (!resposta.ok) throw new Error(dados.erro || "Não foi possível salvar a correção.");
  return true;
}

export function CorrecaoFinanceiraForm({ conta, onCancelar }: { conta: ContaReceber; onCancelar: () => void }) {
  const router = useRouter();
  const [parametros, setParametros] = useState({
    valor_base: conta.valor_base,
    horas_incluidas: conta.horas_incluidas,
    valor_hora_adicional: conta.valor_hora_adicional,
  });
  const [motivo, setMotivo] = useState("");
  const [previa, setPrevia] = useState<PreviaCorrecaoFinanceira>();
  const [confirmado, setConfirmado] = useState(false);
  const [erro, setErro] = useState("");
  const [pendente, setPendente] = useState(false);

  function alterar(campo: keyof typeof parametros, valor: string) {
    setParametros((atuais) => ({ ...atuais, [campo]: valor }));
    setPrevia(undefined);
    setConfirmado(false);
  }

  async function calcular(evento: FormEvent) {
    evento.preventDefault();
    setPendente(true);
    setErro("");
    try {
      setPrevia(await solicitarPreviaCorrecaoFinanceira(conta.id, parametros));
      setConfirmado(false);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível calcular a prévia.");
    } finally {
      setPendente(false);
    }
  }

  async function salvar() {
    if (!previa || !confirmado) return;
    setPendente(true);
    setErro("");
    try {
      await solicitarCorrecaoFinanceira(conta.id, previa, parametros, motivo);
      router.refresh();
      onCancelar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível salvar a correção.");
    } finally {
      setPendente(false);
    }
  }

  return <section aria-labelledby={`correcao-${conta.id}`} className="financial-correction">
    <h3 id={`correcao-${conta.id}`}>Corrigir parâmetros financeiros</h3>
    <p>O cálculo será refeito no servidor. A previsão e o atendimento serão preservados.</p>
    <form onSubmit={calcular}>
      <label>Valor-base<span className="currency-input"><span>R$</span><input min="0" onChange={(e) => alterar("valor_base", e.target.value)} required step="0.01" type="number" value={parametros.valor_base} /></span></label>
      <label>Horas incluídas<input min="0" onChange={(e) => alterar("horas_incluidas", e.target.value)} required step="0.01" type="number" value={parametros.horas_incluidas} /></label>
      <label>Hora adicional<span className="currency-input"><span>R$</span><input min="0" onChange={(e) => alterar("valor_hora_adicional", e.target.value)} required step="0.01" type="number" value={parametros.valor_hora_adicional} /></span></label>
      <label className="financial-correction-reason">Motivo<textarea maxLength={1000} minLength={3} onChange={(e) => setMotivo(e.target.value)} required value={motivo} /></label>
      <div className="financial-correction-actions">
        <button className="secondary-button" disabled={pendente} onClick={onCancelar} type="button">Cancelar</button>
        <button className="primary-button" disabled={pendente} type="submit">Calcular prévia</button>
      </div>
    </form>
    {erro ? <p className="feedback error" role="alert">{erro}</p> : null}
    {previa ? <div className="financial-correction-preview">
      <strong>Prévia do novo cálculo</strong>
      <dl>
        <div><dt>Valor-base</dt><dd>{formatarMoeda(String(previa.atual.valor_base))} → {formatarMoeda(String(previa.novo.valor_base))}</dd></div>
        <div><dt>Horas incluídas</dt><dd>{previa.atual.horas_incluidas}h → {previa.novo.horas_incluidas}h</dd></div>
        <div><dt>Hora adicional</dt><dd>{formatarMoeda(String(previa.atual.valor_hora_adicional))} → {formatarMoeda(String(previa.novo.valor_hora_adicional))}</dd></div>
        <div><dt>Total</dt><dd>{formatarMoeda(String(previa.atual.valor_total))} → {formatarMoeda(String(previa.novo.valor_total))}</dd></div>
        <div><dt>Previsão preservada</dt><dd>{formatarData(previa.previsao_recebimento)}</dd></div>
      </dl>
      {previa.alteracoes.length === 0 ? <p>Nenhuma alteração efetiva foi informada.</p> : <>
        <label className="financial-correction-confirm"><input checked={confirmado} onChange={(e) => setConfirmado(e.target.checked)} type="checkbox" /> Confirmo os valores anteriores e novos desta correção.</label>
        <button className="danger-button" disabled={!confirmado || pendente || motivo.trim().length < 3} onClick={() => void salvar()} type="button">Confirmar correção</button>
      </>}
    </div> : null}
  </section>;
}
