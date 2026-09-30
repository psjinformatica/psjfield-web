"use client";

import { CheckCircle2, File, LoaderCircle, UploadCloud } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ChangeEvent } from "react";

import { formatarCidade, formatarDataHora } from "@/lib/format";
import { MENSAGEM_NUMERO_CHAMADO_INVALIDO, PADRAO_NUMERO_CHAMADO_HTML } from "@/lib/chamado-numero";
import { CAMPOS_PREVIEW_IMPORTACAO } from "@/lib/importacao-campos";
import type { ChamadoDuplicado, PreviaImportacao } from "@/lib/types";
import type { ChamadoImportacao } from "@/lib/types";

type RespostaPrevia = PreviaImportacao & { duplicado: ChamadoDuplicado | null; erro?: string };
type RespostaConfirmacao = { id: number; erro?: string };

type RoteadorPosImportacao = {
  replace: (href: string) => void;
};

const CAMPOS_MULTILINHA = new Set<keyof ChamadoImportacao>(["unidade_nome", "endereco", "atividade"]);

export function CampoRevisaoImportacao({
  campo,
  rotulo,
  valor,
  onChange,
}: {
  campo: keyof ChamadoImportacao;
  rotulo: string;
  valor: string;
  onChange: (valor: string) => void;
}) {
  const propriedades = { value: valor, onChange: (evento: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange(evento.target.value) };
  return <label>{rotulo}
    {CAMPOS_MULTILINHA.has(campo)
      ? <textarea rows={2} {...propriedades} />
      : <input
          type={campo === "data_agendada" ? "date" : campo === "hora_agendada" ? "time" : "text"}
          list={campo === "cliente" ? "clientes-importacao" : undefined}
          pattern={campo === "numero_chamado" ? PADRAO_NUMERO_CHAMADO_HTML : undefined}
          title={campo === "numero_chamado" ? MENSAGEM_NUMERO_CHAMADO_INVALIDO : undefined}
          maxLength={campo === "estado" ? 2 : undefined}
          {...propriedades}
        />}
  </label>;
}

export async function confirmarImportacaoENavegar(
  form: FormData,
  solicitar: typeof fetch,
  router: RoteadorPosImportacao,
) {
  const resposta = await solicitar("/api/importar/confirmar", { method: "POST", body: form });
  const dados = await resposta.json() as RespostaConfirmacao;
  if (!resposta.ok) throw new Error(dados.erro);
  router.replace(`/chamados/${dados.id}`);
}

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
      await confirmarImportacaoENavegar(form, fetch, router);
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
            {CAMPOS_PREVIEW_IMPORTACAO.map(([campo, rotulo]) => (
              <CampoRevisaoImportacao
                key={campo}
                campo={campo}
                rotulo={rotulo}
                valor={String(previa.chamado[campo] ?? "")}
                onChange={(valor) => atualizar(campo, valor)}
              />
            ))}
          </div>
          <datalist id="clientes-importacao">
            <option value="Claro" />
            <option value="DASA" />
          </datalist>
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
