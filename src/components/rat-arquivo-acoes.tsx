"use client";

import { Download, ExternalLink, Share2 } from "lucide-react";
import { useState } from "react";

type Props = {
  chamadoId: number;
  ratId: string;
  nomeArquivo: string;
  visualizarEmRota?: boolean;
};

export function RatArquivoAcoes({ chamadoId, ratId, nomeArquivo, visualizarEmRota = true }: Props) {
  const [compartilhando, setCompartilhando] = useState(false);
  const arquivoUrl = `/api/chamados/${chamadoId}/rat/${ratId}/arquivo`;
  const visualizacaoUrl = visualizarEmRota ? `/chamados/${chamadoId}/rat/${ratId}` : arquivoUrl;

  async function compartilhar() {
    setCompartilhando(true);
    try {
      const resposta = await fetch(`${arquivoUrl}?download=1`);
      if (!resposta.ok) throw new Error("Não foi possível obter o PDF.");
      const arquivo = new File([await resposta.blob()], nomeArquivo, { type: "application/pdf" });
      if (!navigator.canShare?.({ files: [arquivo] })) throw new Error("Compartilhamento de PDF não suportado.");
      await navigator.share({ files: [arquivo], title: nomeArquivo });
    } catch (erro) {
      if (erro instanceof DOMException && erro.name === "AbortError") return;
      window.alert(erro instanceof Error ? erro.message : "Não foi possível compartilhar a RAT.");
    } finally {
      setCompartilhando(false);
    }
  }

  return <div className="rat-file-actions">
    <a className="secondary-button" href={visualizacaoUrl} target={visualizarEmRota ? undefined : "_blank"} rel={visualizarEmRota ? undefined : "noreferrer"}><ExternalLink size={16} />Visualizar RAT</a>
    <a className="secondary-button" href={`${arquivoUrl}?download=1`}><Download size={16} />Baixar RAT</a>
    <button className="secondary-button" type="button" disabled={compartilhando} onClick={compartilhar}>
      <Share2 size={16} />{compartilhando ? "Preparando..." : "Compartilhar RAT"}
    </button>
  </div>;
}
