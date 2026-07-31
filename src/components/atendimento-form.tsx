"use client";

import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { STATUS_FINALIZACAO, statusEncerraAtendimento } from "@/lib/status";
import type { Chamado } from "@/lib/types";

export function AtendimentoForm({ chamado }: { chamado: Chamado }) {
  const router = useRouter();
  const [estado, setEstado] = useState<{ sucesso?: string; erro?: string }>({});
  const [pendente, setPendente] = useState(false);
  const [statusAtual, setStatusAtual] = useState(chamado.status);
  const [horaInicioSalva, setHoraInicioSalva] = useState(chamado.hora_inicio || "");
  const [statusFinal, setStatusFinal] = useState<(typeof STATUS_FINALIZACAO)[number]>("Concluído");
  const [motivo, setMotivo] = useState("");

  async function salvar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setPendente(true);
    setEstado({});
    const form = new FormData(evento.currentTarget);
    const horaInicio = String(form.get("hora_inicio") || "");
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
          hora_chegada: form.get("hora_chegada"),
          hora_inicio: horaInicio,
          hora_termino: form.get("hora_termino"),
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

  return (
    <form onSubmit={salvar} className="form-card">
      <div className="section-heading">
        <span>03</span>
        <div><h2>Atendimento</h2><p>Registre os dados executados em campo.</p></div>
      </div>
      {statusEncerraAtendimento(statusAtual) && (
        <p className="closed-notice" role="status">
          Atendimento encerrado como <strong>{statusAtual}</strong>. Os dados continuam disponíveis para consulta e correção.
        </p>
      )}
      <div className="time-grid">
        <label>Hora chegada<input name="hora_chegada" type="time" defaultValue={chamado.hora_chegada} /></label>
        <label>Hora início<input name="hora_inicio" type="time" defaultValue={chamado.hora_inicio} /></label>
        <label>Hora término<input name="hora_termino" type="time" defaultValue={chamado.hora_termino} /></label>
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
