"use client";

import { CalendarDays, ChevronRight, MapPin, Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { formatarCidade, formatarData, formatarMoeda } from "@/lib/format";
import type { ChamadoResumo } from "@/lib/types";

const statusDisponiveis = ["Todos", "Agendado", "Recebido", "Concluído", "Cancelado"];

export function ChamadosLista({ chamados }: { chamados: ChamadoResumo[] }) {
  const [busca, setBusca] = useState("");
  const [status, setStatus] = useState("Todos");
  const filtrados = useMemo(() => {
    const termo = busca.trim().toLocaleLowerCase("pt-BR");
    return chamados.filter((chamado) => {
      const correspondeStatus = status === "Todos" || chamado.status === status;
      const alvo = [
        chamado.numero_chamado,
        chamado.cliente,
        chamado.projeto,
        chamado.cidade,
        chamado.atividade,
      ].join(" ").toLocaleLowerCase("pt-BR");
      return correspondeStatus && (!termo || alvo.includes(termo));
    });
  }, [busca, chamados, status]);

  return (
    <section aria-labelledby="lista-titulo">
      <h2 id="lista-titulo" className="sr-only">Lista de chamados</h2>
      <div className="filters">
        <label className="search-field">
          <Search size={18} aria-hidden="true" />
          <span className="sr-only">Pesquisar chamados</span>
          <input
            value={busca}
            onChange={(evento) => setBusca(evento.target.value)}
            placeholder="Chamado, cliente ou cidade"
          />
        </label>
        <label>
          <span className="sr-only">Filtrar por status</span>
          <select value={status} onChange={(evento) => setStatus(evento.target.value)}>
            {statusDisponiveis.map((item) => <option key={item}>{item}</option>)}
          </select>
        </label>
      </div>
      <div className="results-row">
        <span>{filtrados.length} resultado(s)</span>
        {(busca || status !== "Todos") && (
          <button className="text-button" onClick={() => { setBusca(""); setStatus("Todos"); }}>
            Limpar filtros
          </button>
        )}
      </div>
      {filtrados.length ? (
        <div className="card-grid">
          {filtrados.map((chamado) => (
            <Link className="call-card" href={`/chamados/${chamado.id}`} key={chamado.id}>
              <div className="call-card-top">
                <span className={`status status-${chamado.status.toLocaleLowerCase("pt-BR").replaceAll(" ", "-")}`}>
                  {chamado.status || "Sem status"}
                </span>
                <ChevronRight size={20} aria-hidden="true" />
              </div>
              <h3>{chamado.numero_chamado || `Chamado ${chamado.id}`}</h3>
              <p className="client-name">{chamado.cliente || "Cliente não informado"}</p>
              <div className="card-meta">
                <span><CalendarDays size={16} />{formatarData(chamado.data_agendada) || "Sem data"} · {chamado.hora_agendada || "--:--"}</span>
                <span><MapPin size={16} />{formatarCidade(chamado.cidade, chamado.estado) || "Cidade não informada"}</span>
              </div>
              {chamado.atividade && <p className="activity">{chamado.atividade}</p>}
              {chamado.valor_base && <strong className="price">{formatarMoeda(chamado.valor_base)}</strong>}
            </Link>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <Search size={28} />
          <h3>Nenhum chamado encontrado</h3>
          <p>Ajuste a pesquisa ou limpe os filtros.</p>
        </div>
      )}
    </section>
  );
}
