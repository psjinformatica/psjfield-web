"use client";

import { CalendarPlus } from "lucide-react";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type RoteadorNovaVisita = { replace: (href: string) => void };

export async function criarVisitaENavegar(
  chamadoId: number,
  dados: { data_agendada: string; hora_agendada: string; unidade_nome: string },
  solicitar: typeof fetch,
  router: RoteadorNovaVisita,
) {
  const resposta = await solicitar(`/api/chamados/${chamadoId}/visitas`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dados),
  });
  const resultado = await resposta.json();
  if (!resposta.ok) throw new Error(resultado.erro || "Não foi possível agendar a nova visita.");
  router.replace(`/chamados/${resultado.id}`);
}

export function AgendarNovaVisita({ chamadoId, unidadeInicial = "" }: {
  chamadoId: number;
  unidadeInicial?: string;
}) {
  const router = useRouter();
  const [data, setData] = useState("");
  const [hora, setHora] = useState("");
  const [unidade, setUnidade] = useState(unidadeInicial);
  const [aberto, setAberto] = useState(false);
  const [pendente, setPendente] = useState(false);
  const [erro, setErro] = useState("");

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setPendente(true);
    setErro("");
    try {
      await criarVisitaENavegar(chamadoId, {
        data_agendada: data,
        hora_agendada: hora,
        unidade_nome: unidade,
      }, fetch, router);
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Não foi possível agendar a nova visita.");
    } finally {
      setPendente(false);
    }
  }

  if (!aberto) {
    return <section className="detail-card">
      <div className="section-heading"><span>+</span><div><h2>Nova visita</h2><p>Crie outra ocorrência sem reabrir ou alterar esta visita.</p></div></div>
      <button className="primary-button" type="button" onClick={() => setAberto(true)}>
        <CalendarPlus size={17} />Agendar nova visita
      </button>
    </section>;
  }

  return <section className="detail-card">
    <div className="section-heading"><span>+</span><div><h2>Agendar nova visita</h2><p>O novo atendimento terá RAT e Financeiro independentes.</p></div></div>
    <form className="form-card" onSubmit={enviar}>
      <div className="review-grid">
        <label>Data<input type="date" required value={data} onChange={(evento) => setData(evento.target.value)} /></label>
        <label>Horário<input type="time" required value={hora} onChange={(evento) => setHora(evento.target.value)} /></label>
        <label>Unidade/Nome<input required value={unidade} onChange={(evento) => setUnidade(evento.target.value)} placeholder="Informe a unidade correta" /></label>
      </div>
      <p className="field-hint">Equipamento e unidade são informações independentes.</p>
      {erro ? <p className="error-message" role="alert">{erro}</p> : null}
      <div className="form-actions">
        <button className="secondary-button" type="button" disabled={pendente} onClick={() => setAberto(false)}>Cancelar</button>
        <button className="primary-button" type="submit" disabled={pendente}>{pendente ? "Agendando..." : "Criar visita"}</button>
      </div>
    </form>
  </section>;
}
