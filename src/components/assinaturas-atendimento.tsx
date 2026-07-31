"use client";

/* eslint-disable @next/next/no-img-element */
import { PenLine } from "lucide-react";
import { useRef, useState } from "react";

import { AssinaturaCanvas, type AssinaturaCanvasRef } from "@/components/assinatura-canvas";
import type { AssinaturaCliente, AssinaturaTecnico, AssinaturaVisualizacao } from "@/lib/assinaturas-types";
import { formatarDataHora } from "@/lib/format";

type ClienteVisual = AssinaturaVisualizacao<AssinaturaCliente> | null;
type TecnicoVisual = AssinaturaVisualizacao<AssinaturaTecnico> | null;

function PreviaAssinatura({ url, alt }: { url: string; alt: string }) {
  return <div className="signature-preview"><img src={url} alt={alt} /></div>;
}

export function AssinaturasAtendimento({ chamadoId, clienteInicial, tecnicoInicial, bloqueado = false }: {
  chamadoId: number;
  clienteInicial: ClienteVisual;
  tecnicoInicial: TecnicoVisual;
  bloqueado?: boolean;
}) {
  const [cliente, setCliente] = useState(clienteInicial);
  const [tecnico, setTecnico] = useState(tecnicoInicial);
  const [editandoCliente, setEditandoCliente] = useState(!clienteInicial);
  const [editandoTecnico, setEditandoTecnico] = useState(false);
  const [nome, setNome] = useState(clienteInicial?.nome_responsavel || "");
  const [documento, setDocumento] = useState(clienteInicial?.documento_responsavel || "");
  const [nomeTecnico, setNomeTecnico] = useState(tecnicoInicial?.nome_tecnico || "");
  const [previaCliente, setPreviaCliente] = useState<string | null>(null);
  const [previaTecnico, setPreviaTecnico] = useState<string | null>(null);
  const [estado, setEstado] = useState<{ erro?: string; sucesso?: string }>({});
  const [salvando, setSalvando] = useState<"cliente" | "tecnico" | null>(null);
  const canvasCliente = useRef<AssinaturaCanvasRef>(null);
  const canvasTecnico = useRef<AssinaturaCanvasRef>(null);

  async function blobDaAssinatura(canvas: AssinaturaCanvasRef | null) {
    if (!canvas || canvas.estaVazia()) throw new Error("Faça a assinatura antes de salvar.");
    const blob = await canvas.gerarPng();
    if (!blob) throw new Error("Não foi possível gerar a imagem da assinatura.");
    return blob;
  }

  function limparComConfirmacao(canvas: AssinaturaCanvasRef | null) {
    if (!canvas || canvas.estaVazia()) return;
    if (window.confirm("Deseja limpar a assinatura desenhada?")) canvas.limpar();
  }

  function confirmarNovaAssinatura(tipo: "cliente" | "tecnico") {
    const mensagem = tipo === "cliente"
      ? "Deseja refazer a assinatura do cliente? A assinatura salva será mantida até a nova ser salva com sucesso."
      : "Deseja substituir a assinatura do técnico? A assinatura salva será mantida até a nova ser salva com sucesso.";
    return window.confirm(mensagem);
  }

  async function salvarCliente() {
    setEstado({}); setSalvando("cliente");
    try {
      const form = new FormData();
      form.set("nome_responsavel", nome);
      form.set("documento_responsavel", documento);
      form.set("assinatura", await blobDaAssinatura(canvasCliente.current), "assinatura.png");
      const resposta = await fetch(`/api/chamados/${chamadoId}/assinatura-cliente`, { method: "POST", body: form });
      const dados = await resposta.json();
      if (!resposta.ok) throw new Error(dados.erro);
      setCliente(dados); setPreviaCliente(null); setEditandoCliente(false);
      setEstado({ sucesso: "Assinatura do cliente confirmada." });
    } catch (erro) {
      setEstado({ erro: erro instanceof Error ? erro.message : "Não foi possível salvar a assinatura." });
    } finally { setSalvando(null); }
  }

  async function salvarTecnico() {
    setEstado({}); setSalvando("tecnico");
    try {
      const form = new FormData();
      form.set("nome_tecnico", nomeTecnico);
      form.set("assinatura", await blobDaAssinatura(canvasTecnico.current), "assinatura.png");
      const resposta = await fetch("/api/assinaturas/tecnico", { method: "POST", body: form });
      const dados = await resposta.json();
      if (!resposta.ok) throw new Error(dados.erro);
      setTecnico(dados); setPreviaTecnico(null); setEditandoTecnico(false);
      setEstado({ sucesso: "Assinatura padrão do técnico confirmada." });
    } catch (erro) {
      setEstado({ erro: erro instanceof Error ? erro.message : "Não foi possível salvar a assinatura." });
    } finally { setSalvando(null); }
  }

  return (
    <section className="form-card signatures-card">
      <div className="section-heading">
        <span><PenLine size={18} /></span>
        <div><h2>Assinaturas</h2><p>Confirmação do cliente e assinatura padrão do técnico.</p></div>
      </div>

      <div className="signature-section">
        <h3>Assinatura do cliente</h3>
        {cliente && !editandoCliente ? (
          <>
            <PreviaAssinatura url={cliente.assinatura_url} alt={`Assinatura de ${cliente.nome_responsavel}`} />
            <div className="signature-meta">
              <strong>{cliente.nome_responsavel}</strong>
              {cliente.documento_responsavel && <span>{cliente.documento_responsavel}</span>}
              <span>Assinado em {formatarDataHora(cliente.assinado_em)}</span>
            </div>
            <button className="secondary-button" type="button" disabled={bloqueado} onClick={() => {
              if (!confirmarNovaAssinatura("cliente")) return;
              setPreviaCliente(null); setEditandoCliente(true);
            }}>Refazer assinatura</button>
          </>
        ) : (
          <>
            <div className="signature-fields">
              <label>Nome do responsável<input disabled={bloqueado} value={nome} onChange={(evento) => setNome(evento.target.value)} /></label>
              <label>Documento do responsável <small>(opcional)</small><input disabled={bloqueado} value={documento} onChange={(evento) => setDocumento(evento.target.value)} /></label>
            </div>
            <AssinaturaCanvas ref={canvasCliente} onPreviewChange={setPreviaCliente} />
            {previaCliente && (
              <div className="signature-draft-preview">
                <span>Prévia antes de salvar</span>
                <PreviaAssinatura url={previaCliente} alt="Prévia da assinatura do cliente" />
                <div className="signature-meta">
                  <strong>{nome || "Nome do responsável não informado"}</strong>
                  {documento && <span>{documento}</span>}
                </div>
                <button className="text-button" type="button" onClick={() => limparComConfirmacao(canvasCliente.current)}>Refazer</button>
              </div>
            )}
            <div className="signature-actions">
              <button className="secondary-button" type="button" disabled={bloqueado} onClick={() => limparComConfirmacao(canvasCliente.current)}>Limpar</button>
              <button className="primary-button" type="button" disabled={bloqueado || salvando !== null} onClick={salvarCliente}>
                {salvando === "cliente" ? "Salvando..." : "Salvar assinatura"}
              </button>
            </div>
          </>
        )}
      </div>

      <div className="signature-section">
        <h3>Assinatura do técnico</h3>
        {tecnico && !editandoTecnico ? (
          <>
            <PreviaAssinatura url={tecnico.assinatura_url} alt={`Assinatura de ${tecnico.nome_tecnico}`} />
            <strong className="signature-technician-name">{tecnico.nome_tecnico}</strong>
            <p className="signature-meta"><span>Atualizada em {formatarDataHora(tecnico.atualizado_em)}</span></p>
            <button className="secondary-button" type="button" disabled={bloqueado} onClick={() => {
              if (!confirmarNovaAssinatura("tecnico")) return;
              setPreviaTecnico(null); setEditandoTecnico(true);
            }}>Substituir assinatura</button>
          </>
        ) : editandoTecnico ? (
          <>
            <label>Nome do técnico<input disabled={bloqueado} value={nomeTecnico} onChange={(evento) => setNomeTecnico(evento.target.value)} /></label>
            <AssinaturaCanvas ref={canvasTecnico} onPreviewChange={setPreviaTecnico} />
            {previaTecnico && (
              <div className="signature-draft-preview">
                <span>Prévia antes de salvar</span>
                <PreviaAssinatura url={previaTecnico} alt="Prévia da assinatura do técnico" />
                <div className="signature-meta"><strong>{nomeTecnico || "Nome do técnico não informado"}</strong></div>
                <button className="text-button" type="button" onClick={() => limparComConfirmacao(canvasTecnico.current)}>Refazer</button>
              </div>
            )}
            <div className="signature-actions">
              <button className="secondary-button" type="button" disabled={bloqueado} onClick={() => limparComConfirmacao(canvasTecnico.current)}>Limpar</button>
              <button className="primary-button" type="button" disabled={bloqueado || salvando !== null} onClick={salvarTecnico}>
                {salvando === "tecnico" ? "Confirmando..." : "Confirmar"}
              </button>
            </div>
          </>
        ) : (
          <button className="primary-button" type="button" disabled={bloqueado} onClick={() => setEditandoTecnico(true)}>Cadastrar assinatura</button>
        )}
      </div>

      {estado.erro && <p className="feedback error" role="alert">{estado.erro}</p>}
      {estado.sucesso && <p className="feedback success" role="status">{estado.sucesso}</p>}
    </section>
  );
}
