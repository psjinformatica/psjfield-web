"use client";

import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { STATUS_FINALIZACAO, statusEncerraAtendimento } from "@/lib/status";
import { normalizarHorarioInput } from "@/lib/format";
import type { Chamado } from "@/lib/types";

const MOTIVOS_REABERTURA = [
  "Status incorreto",
  "Ajuste de descrição",
  "Correção de equipamento",
  "Correção de assinatura",
  "Outro",
] as const;

export function AtendimentoForm({ chamado }: { chamado: Chamado }) {
  const router = useRouter();
  const [estado, setEstado] = useState<{ sucesso?: string; erro?: string }>({});
  const [pendente, setPendente] = useState(false);
  const [statusAtual, setStatusAtual] = useState(chamado.status);
  const [horaChegada, setHoraChegada] = useState(normalizarHorarioInput(chamado.hora_chegada));
  const [horaInicio, setHoraInicio] = useState(normalizarHorarioInput(chamado.hora_inicio));
  const [horaTermino, setHoraTermino] = useState(normalizarHorarioInput(chamado.hora_termino));
  const [horaInicioSalva, setHoraInicioSalva] = useState(normalizarHorarioInput(chamado.hora_inicio));
  const [statusFinal, setStatusFinal] = useState<(typeof STATUS_FINALIZACAO)[number]>("Concluído");
  const [motivo, setMotivo] = useState("");
  const [mostrarReabertura, setMostrarReabertura] = useState(false);
  const [motivoReabertura, setMotivoReabertura] = useState("");
  const [outroMotivo, setOutroMotivo] = useState("");

  async function salvar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setPendente(true);
    setEstado({});
    const form = new FormData(evento.currentTarget);
    const alterouHoraInicio = Boolean(horaInicioSalva && horaInicioSalva !== horaInicio);
    if (alterouHoraInicio && !window.confirm("Confirma a alteração do horário de início já registrado?")) {
      setPendente(false);
      return;
    }
    try {
      const resposta = await fetch(`/api/chamados/${chamado.id}/atendimento`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hora_chegada: horaChegada,
          hora_inicio: horaInicio,
          hora_termino: horaTermino,
          descricao_servico: form.get("descricao_servico"),
          observacoes_atendimento: form.get("observacoes_atendimento"),
          confirmar_alteracao_hora_inicio: alterouHoraInicio,
        }),
      });
      const dados = await resposta.json();
      if (!resposta.ok) throw new Error(dados.erro);
      setStatusAtual(dados.status);
      setHoraInicioSalva(dados.hora_inicio || "");
      setEstado({ sucesso: "Atendimento salvo com sucesso." });
      router.refresh();
    } catch (erro) {
      setEstado({ erro: erro instanceof Error ? erro.message : "Não foi possível salvar." });
    } finally {
      setPendente(false);
    }
  }

  async function finalizar() {
    if ((statusFinal === "Improdutivo" || statusFinal === "Cancelado") && !motivo.trim()) {
      setEstado({ erro: `Informe o motivo do status ${statusFinal}.` });
      return;
    }
    const complemento = statusFinal === "Concluído"
      ? ""
      : `\nMotivo: ${motivo.trim()}`;
    if (!window.confirm(`Finalizar este chamado como ${statusFinal}?${complemento}`)) return;
    setPendente(true);
    setEstado({});
    try {
      const resposta = await fetch(`/api/chamados/${chamado.id}/finalizar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: statusFinal, motivo }),
      });
      const dados = await resposta.json();
      if (!resposta.ok) throw new Error(dados.erro);
      setStatusAtual(dados.status);
      setEstado({ sucesso: `Chamado finalizado como ${dados.status}.` });
      router.refresh();
    } catch (erro) {
      setEstado({ erro: erro instanceof Error ? erro.message : "Não foi possível finalizar." });
    } finally {
      setPendente(false);
    }
  }

  async function reabrir() {
    const motivoFinal = motivoReabertura === "Outro" ? outroMotivo.trim() : motivoReabertura;
    if (!motivoFinal) {
      setEstado({ erro: "Informe o motivo da reabertura." });
      return;
    }
    if (!window.confirm("Deseja realmente reabrir este atendimento?\n\nA reabertura permitirá alterar dados, assinaturas e gerar uma nova RAT.")) return;
    setPendente(true);
    setEstado({});
    try {
      const resposta = await fetch(`/api/chamados/${chamado.id}/reabrir`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ motivo: motivoFinal }),
      });
      const dados = await resposta.json();
      if (!resposta.ok) throw new Error(dados.erro);
      setStatusAtual(dados.status);
      setMostrarReabertura(false);
      setEstado({ sucesso: "Atendimento reaberto com sucesso." });
      router.refresh();
    } catch (erro) {
      setEstado({ erro: erro instanceof Error ? erro.message : "Não foi possível reabrir o atendimento." });
    } finally {
      setPendente(false);
    }
  }

  return (
    <form onSubmit={salvar} className="form-card">
      <div className="section-heading">
        <span>03</span>
        <div><h2>Atendimento</h2><p>Registre os dados executados em campo.</p></div>
      </div>
      {statusEncerraAtendimento(statusAtual) && (
        <>
          <p className="closed-notice" role="status">
            Atendimento encerrado como <strong>{statusAtual}</strong>. Reabra o atendimento antes de realizar correções.
          </p>
          <section className="reopen-panel" aria-labelledby="reabrir-titulo">
            <h3 id="reabrir-titulo">Reabrir atendimento</h3>
            <p>A reabertura preserva os dados, assinaturas e versões anteriores da RAT.</p>
            {!mostrarReabertura ? (
              <button className="secondary-button" type="button" onClick={() => { setMostrarReabertura(true); setEstado({}); }}>
                Reabrir atendimento
              </button>
            ) : (
              <div className="reopen-form">
                <label>Motivo da reabertura
                  <select value={motivoReabertura} onChange={(evento) => setMotivoReabertura(evento.target.value)}>
                    <option value="">Selecione um motivo</option>
                    {MOTIVOS_REABERTURA.map((item) => <option key={item}>{item}</option>)}
                  </select>
                </label>
                {motivoReabertura === "Outro" && (
                  <label>Descreva o motivo
                    <textarea value={outroMotivo} onChange={(evento) => setOutroMotivo(evento.target.value)} rows={3} />
                  </label>
                )}
                <div className="reopen-actions">
                  <button className="secondary-button" type="button" disabled={pendente} onClick={() => setMostrarReabertura(false)}>Cancelar</button>
                  <button className="primary-button" type="button" disabled={pendente} onClick={reabrir}>{pendente ? "Reabrindo..." : "Reabrir"}</button>
                </div>
              </div>
            )}
          </section>
        </>
      )}
      <div className="time-grid">
        <label>Hora chegada<input name="hora_chegada" type="time" value={horaChegada} onChange={(evento) => setHoraChegada(evento.target.value)} /></label>
        <label>Hora início<input name="hora_inicio" type="time" value={horaInicio} onChange={(evento) => setHoraInicio(evento.target.value)} /></label>
        <label>Hora término<input name="hora_termino" type="time" value={horaTermino} onChange={(evento) => setHoraTermino(evento.target.value)} /></label>
      </div>
      <label>Descrição do serviço
        <textarea name="descricao_servico" rows={6} defaultValue={chamado.descricao_servico} placeholder="Descreva o serviço realizado..." />
      </label>
      <label>Observações
        <textarea name="observacoes_atendimento" rows={4} defaultValue={chamado.observacoes_atendimento} placeholder="Registre pendências ou informações adicionais..." />
      </label>
      {estado.erro && <p className="feedback error" role="alert">{estado.erro}</p>}
      {estado.sucesso && <p className="feedback success" role="status">{estado.sucesso}</p>}
      <button className="primary-button" disabled={pendente}>
        {pendente ? "Salvando..." : "Salvar atendimento"}
      </button>
      {!statusEncerraAtendimento(statusAtual) && (
        <section className="finish-panel" aria-labelledby="finalizar-titulo">
          <h3 id="finalizar-titulo">Finalizar chamado</h3>
          <p>O encerramento do chamado é separado da futura geração da RAT.</p>
          <label>Status final
            <select value={statusFinal} onChange={(evento) => setStatusFinal(evento.target.value as typeof statusFinal)}>
              {STATUS_FINALIZACAO.map((status) => <option key={status}>{status}</option>)}
            </select>
          </label>
          {(statusFinal === "Improdutivo" || statusFinal === "Cancelado") && (
            <label>Motivo obrigatório
              <textarea
                value={motivo}
                onChange={(evento) => setMotivo(evento.target.value)}
                rows={3}
                placeholder={`Informe o motivo do status ${statusFinal}...`}
              />
            </label>
          )}
          <button className="danger-button" type="button" disabled={pendente} onClick={finalizar}>
            {pendente ? "Processando..." : "Finalizar chamado"}
          </button>
        </section>
      )}
    </form>
  );
}
