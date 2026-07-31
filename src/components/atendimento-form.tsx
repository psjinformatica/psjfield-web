"use client";

import { type FormEvent, useState } from "react";

import type { Chamado } from "@/lib/types";

export function AtendimentoForm({ chamado }: { chamado: Chamado }) {
  const [estado, setEstado] = useState<{ sucesso?: string; erro?: string }>({});
  const [pendente, setPendente] = useState(false);

  async function salvar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setPendente(true);
    setEstado({});
    const form = new FormData(evento.currentTarget);
    try {
      const resposta = await fetch(`/api/chamados/${chamado.id}/atendimento`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hora_chegada: form.get("hora_chegada"),
          hora_inicio: form.get("hora_inicio"),
          hora_termino: form.get("hora_termino"),
          descricao_servico: form.get("descricao_servico"),
          observacoes_atendimento: form.get("observacoes_atendimento"),
        }),
      });
      const dados = await resposta.json();
      if (!resposta.ok) throw new Error(dados.erro);
      setEstado({ sucesso: "Atendimento salvo com sucesso." });
    } catch (erro) {
      setEstado({ erro: erro instanceof Error ? erro.message : "Não foi possível salvar." });
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
    </form>
  );
}
