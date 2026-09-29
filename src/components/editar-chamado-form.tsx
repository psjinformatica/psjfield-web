"use client";

import { LoaderCircle, Save } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, type ChangeEvent, type FormEvent } from "react";

import {
  CAMPOS_COMPARTILHAVEIS_VISITAS,
  CAMPOS_FINANCEIROS_CHAMADO,
  ROTULOS_CAMPOS_EDICAO_CHAMADO,
  camposAlterados,
  dadosEditaveisDoChamado,
  type CampoEdicaoChamado,
  type ContextoEdicaoChamado,
  type DadosEdicaoChamado,
  type EscopoEdicaoChamado,
} from "@/lib/chamados-edicao";
import { formatarDataHora } from "@/lib/format";

const CAMPOS_LONGOS = new Set<CampoEdicaoChamado>([
  "unidade_nome", "endereco", "atividade", "descricao", "observacoes", "equipamento",
]);

const GRUPOS: Array<{ titulo: string; campos: CampoEdicaoChamado[] }> = [
  { titulo: "Identificação", campos: ["numero_chamado", "cliente", "projeto", "usuario_responsavel"] },
  { titulo: "Local e contato", campos: ["contato", "telefone", "unidade_nome", "endereco", "cidade", "estado"] },
  { titulo: "Solicitação", campos: ["atividade", "descricao", "observacoes"] },
  { titulo: "Equipamento", campos: ["equipamento", "fabricante", "modelo", "numero_serie", "patrimonio_ae"] },
  { titulo: "Parâmetros financeiros do chamado", campos: ["valor_base", "horas_incluidas", "valor_hora_adicional"] },
];

export function resumirAlteracoesEdicao(anterior: DadosEdicaoChamado, novo: DadosEdicaoChamado) {
  return camposAlterados(anterior, novo).map((campo) => ({
    campo,
    rotulo: ROTULOS_CAMPOS_EDICAO_CHAMADO[campo],
    anterior: anterior[campo] ?? "",
    novo: novo[campo] ?? "",
  }));
}

export async function solicitarEdicaoChamado(
  chamadoId: number,
  corpo: unknown,
  solicitar: typeof fetch = fetch,
) {
  return solicitar(`/api/chamados/${chamadoId}/dados`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(corpo),
  });
}

function CampoEdicao({
  campo,
  valor,
  bloqueado,
  onChange,
}: {
  campo: CampoEdicaoChamado;
  valor: string | null;
  bloqueado: boolean;
  onChange: (valor: string | null) => void;
}) {
  const financeiro = CAMPOS_FINANCEIROS_CHAMADO.includes(campo as typeof CAMPOS_FINANCEIROS_CHAMADO[number]);
  const propriedades = {
    id: `campo-${campo}`,
    value: valor ?? "",
    disabled: bloqueado,
    onChange: (evento: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => (
      onChange(financeiro && evento.target.value === "" ? null : evento.target.value)
    ),
  };
  return <label htmlFor={`campo-${campo}`}>
    {ROTULOS_CAMPOS_EDICAO_CHAMADO[campo]}
    {CAMPOS_LONGOS.has(campo)
      ? <textarea rows={campo === "atividade" || campo === "descricao" || campo === "observacoes" ? 4 : 2} {...propriedades} />
      : <input
          type={financeiro ? "number" : "text"}
          min={financeiro ? "0" : undefined}
          step={financeiro ? "0.01" : undefined}
          maxLength={campo === "estado" ? 2 : undefined}
          {...propriedades}
        />}
  </label>;
}

export function EditarChamadoForm({ contexto }: { contexto: ContextoEdicaoChamado }) {
  const router = useRouter();
  const inicial = useMemo(() => dadosEditaveisDoChamado(contexto.chamado), [contexto.chamado]);
  const [dados, setDados] = useState<DadosEdicaoChamado>(inicial);
  const [escopo, setEscopo] = useState<EscopoEdicaoChamado>("SOMENTE_ESTA_VISITA");
  const [revisando, setRevisando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const resumo = resumirAlteracoesEdicao(inicial, dados);
  const atendimentoEncerrado = contexto.chamado.status === "Concluído" || contexto.chamado.status === "Improdutivo";
  const financeiroSomenteLeitura = contexto.possui_recebivel || atendimentoEncerrado;
  const mudouCompartilhavel = resumo.some(({ campo }) => CAMPOS_COMPARTILHAVEIS_VISITAS.includes(
    campo as typeof CAMPOS_COMPARTILHAVEIS_VISITAS[number],
  ));

  function atualizar(campo: CampoEdicaoChamado, valor: string | null) {
    setDados((atual) => ({ ...atual, [campo]: valor }));
    setRevisando(false);
    setErro("");
  }

  function revisar(evento: FormEvent) {
    evento.preventDefault();
    if (resumo.length === 0) {
      setErro("Nenhuma alteração foi informada.");
      return;
    }
    setErro("");
    setRevisando(true);
  }

  async function confirmar() {
    setSalvando(true);
    setErro("");
    try {
      const resposta = await solicitarEdicaoChamado(contexto.chamado.id, {
        dados,
        escopo,
        versao_dados: contexto.versao_dados,
        versao_grupo: contexto.versao_grupo,
      });
      const retorno = await resposta.json() as { erro?: string };
      if (!resposta.ok) throw new Error(retorno.erro || "Não foi possível salvar as alterações.");
      router.replace(`/chamados/${contexto.chamado.id}`);
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Não foi possível salvar as alterações.");
      setRevisando(false);
    } finally {
      setSalvando(false);
    }
  }

  return <>
    <form className="edit-call-form" onSubmit={revisar}>
      {GRUPOS.map((grupo) => <fieldset key={grupo.titulo}>
        <legend>{grupo.titulo}</legend>
        {grupo.campos[0] === "valor_base" && financeiroSomenteLeitura
          ? <p className="form-note">{contexto.possui_recebivel
            ? "Financeiro já consolidado. Estes parâmetros permanecem somente leitura e o recebível histórico não será recalculado."
            : "Atendimento já encerrado. Estes parâmetros permanecem somente leitura para preservar a base financeira do encerramento."}</p>
          : null}
        <div className="edit-call-grid">
          {grupo.campos.map((campo) => <CampoEdicao
            key={campo}
            campo={campo}
            valor={dados[campo]}
            bloqueado={financeiroSomenteLeitura && CAMPOS_FINANCEIROS_CHAMADO.includes(
              campo as typeof CAMPOS_FINANCEIROS_CHAMADO[number],
            )}
            onChange={(valor) => atualizar(campo, valor)}
          />)}
        </div>
      </fieldset>)}

      {contexto.quantidade_visitas > 1 && mudouCompartilhavel ? <fieldset className="edit-scope">
        <legend>Aplicação nas visitas relacionadas</legend>
        <p>Há {contexto.quantidade_visitas} visitas neste chamado. Escolha explicitamente onde aplicar os dados compartilháveis alterados.</p>
        <label><input type="radio" name="escopo" checked={escopo === "SOMENTE_ESTA_VISITA"} onChange={() => setEscopo("SOMENTE_ESTA_VISITA")} />Somente esta visita</label>
        <label><input type="radio" name="escopo" checked={escopo === "TODAS_VISITAS_RELACIONADAS"} onChange={() => setEscopo("TODAS_VISITAS_RELACIONADAS")} />Esta visita e todas as visitas relacionadas</label>
        <small>Descrição, observações e parâmetros financeiros continuam próprios da visita aberta.</small>
      </fieldset> : null}

      {erro ? <p className="feedback error" role="alert">{erro}</p> : null}
      <div className="edit-call-actions">
        <Link className="secondary-button" href={`/chamados/${contexto.chamado.id}`}>Cancelar</Link>
        <button className="primary-button" type="submit" disabled={salvando}><Save size={17} />Revisar alterações</button>
      </div>
    </form>

    {revisando ? <section className="edit-confirmation" aria-label="Confirmação das alterações">
      <h2>Confirmar alterações</h2>
      <p>Confira os valores antes de salvar. RATs e Financeiro existentes não serão modificados.</p>
      <dl>{resumo.map((item) => <div key={item.campo}>
        <dt>{item.rotulo}</dt>
        <dd><span>De: {String(item.anterior) || "—"}</span><strong>Para: {String(item.novo) || "—"}</strong></dd>
      </div>)}</dl>
      <div className="edit-call-actions">
        <button className="secondary-button" type="button" disabled={salvando} onClick={() => setRevisando(false)}>Voltar à edição</button>
        <button className="primary-button" type="button" disabled={salvando} onClick={() => { void confirmar(); }}>
          {salvando ? <LoaderCircle className="spin" size={17} /> : <Save size={17} />}
          {salvando ? "Salvando..." : "Salvar alterações"}
        </button>
      </div>
    </section> : null}

    <section className="edit-history">
      <h2>Histórico de alterações</h2>
      {contexto.alteracoes.length === 0 ? <p>Nenhuma edição cadastral registrada.</p> : contexto.alteracoes.map((alteracao) => <details key={alteracao.id}>
        <summary>{formatarDataHora(alteracao.alterado_em)} — {alteracao.campos_alterados.map((campo) => ROTULOS_CAMPOS_EDICAO_CHAMADO[campo]).join(", ")}</summary>
        <dl>{alteracao.campos_alterados.map((campo) => <div key={campo}>
          <dt>{ROTULOS_CAMPOS_EDICAO_CHAMADO[campo]}</dt>
          <dd>De: {String(alteracao.valores_anteriores[campo] ?? "—")}<br />Para: {String(alteracao.valores_novos[campo] ?? "—")}</dd>
        </div>)}</dl>
      </details>)}
    </section>
  </>;
}
