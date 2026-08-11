"use client";

import { FileDown, LoaderCircle } from "lucide-react";
import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { RatArquivoAcoes } from "@/components/rat-arquivo-acoes";
import { nomeArquivoRat } from "@/lib/rat-arquivo";
import { CONDICOES_EQUIPAMENTO, DIAGNOSTICOS, ITENS_AFETADOS, STATUS_EQUIPAMENTO, TIPOS_EQUIPAMENTO, TIPOS_OCORRENCIA, VALIDACOES_FINAIS, type RatRegistro, type RatRevisao } from "@/lib/rat-types";

function Grupo({ titulo, nome, opcoes, selecionados, unico = false }: { titulo: string; nome: string; opcoes: readonly string[]; selecionados: string[]; unico?: boolean }) {
  return <fieldset className="rat-fieldset"><legend>{titulo}</legend><div className="rat-check-grid">{opcoes.map((opcao) =>
    <label key={opcao}><input type={unico ? "radio" : "checkbox"} name={nome} value={opcao} defaultChecked={selecionados.includes(opcao)} />{opcao}</label>)}</div></fieldset>;
}
function Campo({ nome, rotulo, valor = "", tipo = "text" }: { nome: keyof RatRevisao; rotulo: string; valor?: string; tipo?: string }) {
  return <label>{rotulo}<input name={nome} type={tipo} defaultValue={valor} /></label>;
}
const camposEquipamento = ["serial", "ae", "fabricante", "modelo", "processador", "hd", "hostname", "memoria"] as const;
const rotulosEquipamento = ["Serial", "AE", "Fabricante", "Modelo", "Processador", "HD/SSD", "Hostname", "Memória"];

export function RatForm({ chamadoId, status, inicial, versoes }: { chamadoId: number; status: string; inicial: RatRevisao; versoes: RatRegistro[] }) {
  const router = useRouter();
  const [pendente, setPendente] = useState(false);
  const [feedback, setFeedback] = useState<{ erro?: string; sucesso?: string }>({});
  async function gerar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const form = new FormData(evento.currentTarget);
    const dados = Object.fromEntries(form.entries()) as unknown as RatRevisao;
    for (const nome of ["tipos_ocorrencia", "itens_afetados", "diagnosticos", "status_equipamento", "validacoes_finais"] as const) dados[nome] = form.getAll(nome).map(String);
    dados.recebido_laboratorio = form.get("recebido_laboratorio") === "on";
    dados.recebido_estoque = form.get("recebido_estoque") === "on";
    if (dados.descricao.length > 270 && !window.confirm("A descrição ultrapassa o espaço de três linhas e será limitada no PDF. Deseja continuar?")) return;
    const confirmar = status === "Cancelado" ? window.confirm("O chamado está cancelado. Confirma a geração excepcional da RAT?") : false;
    if (status === "Cancelado" && !confirmar) return;
    setPendente(true); setFeedback({});
    try {
      const resposta = await fetch(`/api/chamados/${chamadoId}/rat`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ dados, confirmar_cancelado: confirmar }) });
      const resultado = await resposta.json();
      if (!resposta.ok) throw new Error(resultado.erro);
      setFeedback({ sucesso: `RAT versão ${resultado.versao} gerada com sucesso.` }); router.refresh();
    } catch (erro) { setFeedback({ erro: erro instanceof Error ? erro.message : "Não foi possível gerar a RAT." }); }
    finally { setPendente(false); }
  }
  return <>
    <form className="form-card rat-form" onSubmit={gerar}>
      <div className="section-heading"><span>RAT</span><div><h2>Revisão da RAT</h2><p>Confira e complete os campos antes de gerar o PDF.</p></div></div>
      <p className="rat-warning">Campos vazios permanecerão em branco e nenhuma informação será inferida. Textos que excederem o espaço de uma página serão limitados com aviso antes da geração.</p>
      <Grupo titulo="Tipo de ocorrência" nome="tipos_ocorrencia" opcoes={TIPOS_OCORRENCIA} selecionados={inicial.tipos_ocorrencia} />
      <div className="review-grid">
        <Campo nome="chamado" rotulo="Chamado" valor={inicial.chamado} /><Campo nome="login" rotulo="Login" valor={inicial.login} />
        <Campo nome="data_inicio" rotulo="Data início" valor={inicial.data_inicio} tipo="date" /><Campo nome="hora_inicio" rotulo="Hora início" valor={inicial.hora_inicio} tipo="time" />
        <Campo nome="data_fim" rotulo="Data fim" valor={inicial.data_fim} tipo="date" />
        <Campo nome="colaborador" rotulo="Colaborador" valor={inicial.colaborador} /><Campo nome="telefone" rotulo="Telefone" valor={inicial.telefone} />
        <Campo nome="email" rotulo="E-mail" valor={inicial.email} tipo="email" /><Campo nome="localidade" rotulo="Localidade" valor={inicial.localidade} />
      </div>
      <Grupo titulo="Tipo de equipamento" nome="tipo_equipamento" opcoes={TIPOS_EQUIPAMENTO} selecionados={inicial.tipo_equipamento ? [inicial.tipo_equipamento] : []} unico />
      <div className="review-grid"><Campo nome="outro_equipamento" rotulo="Outro equipamento" valor={inicial.outro_equipamento} /><Campo nome="dominio" rotulo="Domínio" valor={inicial.dominio} /></div>
      {(["atual", "novo"] as const).map((prefixo) => <section key={prefixo}><h3>Equipamento {prefixo === "atual" ? "atual" : "novo (opcional)"}</h3><div className="review-grid">{camposEquipamento.map((campo, indice) => {
        const nome = `${prefixo}_${campo}` as keyof RatRevisao; return <Campo key={nome} nome={nome} rotulo={rotulosEquipamento[indice]} valor={String(inicial[nome])} />;
      })}</div></section>)}
      <div className="review-grid"><Campo nome="pasta_perfil_pst" rotulo="Pasta/Perfil/PST" valor={inicial.pasta_perfil_pst} /><Campo nome="software" rotulo="Software" valor={inicial.software} /></div>
      <fieldset className="rat-fieldset"><legend>Logística</legend><div className="rat-check-grid"><label><input name="recebido_laboratorio" type="checkbox" defaultChecked={inicial.recebido_laboratorio} />Recebido em laboratório</label><label><input name="recebido_estoque" type="checkbox" defaultChecked={inicial.recebido_estoque} />Recebido em estoque</label></div><div className="review-grid"><Campo nome="analista_logistica" rotulo="Analista logística" valor={inicial.analista_logistica} /><Campo nome="data_hora_logistica" rotulo="Data e hora logística" valor={inicial.data_hora_logistica} /></div></fieldset>
      <Grupo titulo="Item afetado" nome="itens_afetados" opcoes={ITENS_AFETADOS} selecionados={inicial.itens_afetados} />
      <div className="review-grid"><Campo nome="item_outros" rotulo="Outro item afetado" valor={inicial.item_outros} /><Campo nome="memoria_frequencia" rotulo="Memória/Frequência" valor={inicial.memoria_frequencia} /><Campo nome="part_number" rotulo="Part number" valor={inicial.part_number} /><Campo nome="centro_custo" rotulo="Centro de custo" valor={inicial.centro_custo} /></div>
      <Grupo titulo="Diagnóstico" nome="diagnosticos" opcoes={DIAGNOSTICOS} selecionados={inicial.diagnosticos} />
      <Campo nome="diagnostico_outros" rotulo="Outros diagnósticos" valor={inicial.diagnostico_outros} />
      <label>Descrição<textarea name="descricao" rows={5} defaultValue={inicial.descricao} /></label>
      <Grupo titulo="Status do equipamento" nome="status_equipamento" opcoes={STATUS_EQUIPAMENTO} selecionados={inicial.status_equipamento} />
      <Grupo titulo="Condição" nome="condicao_equipamento" opcoes={CONDICOES_EQUIPAMENTO} selecionados={inicial.condicao_equipamento ? [inicial.condicao_equipamento] : []} unico />
      <Campo nome="qualificacao" rotulo="Qualificação" valor={inicial.qualificacao} />
      <Grupo titulo="Validação final" nome="validacoes_finais" opcoes={VALIDACOES_FINAIS} selecionados={inicial.validacoes_finais} />
      {feedback.erro && <p className="feedback error" role="alert">{feedback.erro}</p>}{feedback.sucesso && <p className="feedback success" role="status">{feedback.sucesso}</p>}
      <button className="primary-button" disabled={pendente}>{pendente ? <><LoaderCircle className="spin" size={17} />Gerando...</> : <><FileDown size={17} />Gerar RAT em PDF</>}</button>
    </form>
    {versoes.length > 0 && <section className="detail-card"><div className="section-heading"><span>PDF</span><div><h2>Versões geradas</h2><p>A versão anterior é preservada.</p></div></div><div className="rat-versions">{versoes.map((rat) =>
      <div key={rat.id}><strong>Versão {rat.versao}{rat.atual ? " · Atual" : ""}</strong><span>{new Date(rat.gerado_em).toLocaleString("pt-BR")}</span><RatArquivoAcoes chamadoId={chamadoId} ratId={rat.id} nomeArquivo={nomeArquivoRat(inicial.chamado, rat.versao)} /></div>)}</div></section>}
  </>;
}
