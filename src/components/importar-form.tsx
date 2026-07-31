"use client";

import { CheckCircle2, File, LoaderCircle, UploadCloud } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { formatarCidade, formatarDataHora } from "@/lib/format";
import type { ChamadoDuplicado, PreviaImportacao } from "@/lib/types";

type RespostaPrevia = PreviaImportacao & { duplicado: ChamadoDuplicado | null; erro?: string };

const campos = [
  ["numero_chamado", "Número do chamado"],
  ["cliente", "Cliente"],
  ["projeto", "Projeto"],
  ["data_agendada", "Data"],
  ["hora_agendada", "Hora"],
  ["contato", "Contato"],
  ["telefone", "Telefone"],
  ["endereco", "Endereço"],
  ["cidade", "Cidade"],
  ["estado", "UF"],
  ["atividade", "Atividade"],
  ["equipamento", "Equipamento"],
  ["fabricante", "Fabricante"],
  ["modelo", "Modelo"],
  ["numero_serie", "Número de série"],
  ["patrimonio_ae", "AE"],
  ["valor_base", "Valor base"],
  ["valor_hora_adicional", "Hora adicional"],
] as const;

export function ImportarForm() {
  const router = useRouter();
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [previa, setPrevia] = useState<RespostaPrevia | null>(null);
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  async function preparar() {
    if (!arquivo) return;
    setCarregando(true); setErro(""); setPrevia(null);
    const form = new FormData(); form.set("arquivo", arquivo);
    try {
      const resposta = await fetch("/api/importar/previa", { method: "POST", body: form });
      const dados = await resposta.json();
      if (!resposta.ok) throw new Error(dados.erro);
      setPrevia(dados);
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Não foi possível processar o arquivo.");
    } finally { setCarregando(false); }
  }

  function atualizar(campo: string, valor: string) {
    if (!previa) return;
    setPrevia({ ...previa, chamado: { ...previa.chamado, [campo]: valor } });
  }

  async function confirmar() {
    if (!arquivo || !previa || previa.duplicado) return;
    setCarregando(true); setErro("");
    const form = new FormData();
    form.set("arquivo", arquivo);
    form.set("dados", JSON.stringify(previa.chamado));
    try {
      const resposta = await fetch("/api/importar/confirmar", { method: "POST", body: form });
      const dados = await resposta.json();
      if (!resposta.ok) throw new Error(dados.erro);
      router.push(`/chamados/${dados.id}`);
      router.refresh();
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Não foi possível importar.");
    } finally { setCarregando(false); }
  }

  return (
    <div className="import-flow">
      <section className="upload-card">
        <UploadCloud size={30} />
        <div><h2>Selecione o e-mail</h2><p>Arquivo .eml de até 10 MB.</p></div>
        <input
          aria-label="Arquivo EML"
          type="file"
          accept=".eml,message/rfc822"
          onChange={(evento) => { setArquivo(evento.target.files?.[0] || null); setPrevia(null); }}
        />
        {arquivo && <p className="selected-file"><File size={17} />{arquivo.name}</p>}
        <button className="primary-button" disabled={!arquivo || carregando} onClick={preparar}>
          {carregando && !previa ? <LoaderCircle className="spin" size={18} /> : null}
          Analisar e-mail
        </button>
      </section>
      {erro && <p className="feedback error" role="alert">{erro}</p>}
      {previa?.duplicado && (
        <section className="review-card duplicate-card">
          <div className="section-heading">
            <span><CheckCircle2 size={18} /></span>
            <div>
              <h2>Este chamado já foi importado anteriormente.</h2>
              <p>A duplicidade continua bloqueada. Você pode abrir o registro existente.</p>
            </div>
          </div>
          <dl className="duplicate-details">
            {previa.duplicado.numero_chamado && <div><dt>Chamado</dt><dd>{previa.duplicado.numero_chamado}</dd></div>}
            {previa.duplicado.cliente && <div><dt>Cliente</dt><dd>{previa.duplicado.cliente}</dd></div>}
            {formatarCidade(previa.duplicado.cidade, previa.duplicado.estado) && (
              <div><dt>Cidade</dt><dd>{formatarCidade(previa.duplicado.cidade, previa.duplicado.estado)}</dd></div>
            )}
            {previa.duplicado.importado_em && (
              <div><dt>Importado em</dt><dd>{formatarDataHora(previa.duplicado.importado_em)}</dd></div>
            )}
          </dl>
          <div className="duplicate-actions">
            <Link className="primary-button" href={`/chamados/${previa.duplicado.chamado_id}`}>Abrir chamado</Link>
            <Link className="secondary-button" href="/chamados">Voltar para lista</Link>
          </div>
        </section>
      )}
      {previa && !previa.duplicado && (
        <section className="review-card">
          <div className="section-heading">
            <span><CheckCircle2 size={18} /></span>
            <div><h2>Revise antes de importar</h2><p>{previa.reconhecidoGrupoEasy ? "Padrão Grupo Easy reconhecido." : "E-mail genérico: somente dados seguros foram carregados."}</p></div>
          </div>
          <div className="review-grid">
            {campos.map(([campo, rotulo]) => (
              <label key={campo}>{rotulo}
                <input
                  type={campo === "data_agendada" ? "date" : campo === "hora_agendada" ? "time" : "text"}
                  value={String(previa.chamado[campo] ?? "")}
                  onChange={(evento) => atualizar(campo, evento.target.value)}
                />
              </label>
            ))}
          </div>
          <label>Descrição
            <textarea rows={4} value={previa.chamado.descricao} onChange={(evento) => atualizar("descricao", evento.target.value)} />
          </label>
          <label>Observações
            <textarea rows={4} value={previa.chamado.observacoes} onChange={(evento) => atualizar("observacoes", evento.target.value)} />
          </label>
          <button className="primary-button" disabled={carregando} onClick={confirmar}>
            {carregando ? "Importando..." : "Confirmar importação"}
          </button>
        </section>
      )}
    </div>
  );
}
