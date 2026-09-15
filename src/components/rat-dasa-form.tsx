"use client";

import { ChevronDown, ExternalLink, FileDown, LoaderCircle, UserRoundCheck } from "lucide-react";
import { type FormEvent, type ReactNode, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { RatArquivoAcoes } from "@/components/rat-arquivo-acoes";
import { nomeArquivoRat } from "@/lib/rat-arquivo";
import {
  AVALIACOES_DASA,
  MOTIVOS_LAUDO_DASA,
  TIPOS_ATENDIMENTO_DASA,
  TIPOS_EQUIPAMENTO_DASA,
  type RatDasaSnapshotV1,
} from "@/lib/rat-dasa-types";
import { listarPendenciasRatDasaV1, type PendenciaRatDasa } from "@/lib/rat-dasa-validation";
import type { RatRegistro } from "@/lib/rat-types";

const ROTULOS_ATENDIMENTO = {
  FIELD_SERVICES: "Field Services",
  REMOTE_HANDS: "Remote Hands",
  RDM: "RDM - Nível 0",
  PROJETO: "Projeto",
} as const;

const ROTULOS_CHECKLIST = {
  energia: "Verificar cabos de energia",
  cabo_video: "Verificar conexão do cabo de vídeo",
  demais_perifericos: "Verificar demais periféricos",
  rede_rj45: "Verificar cabo de rede/RJ45",
  system_center: "Verificar System Center",
  antivirus: "Verificar antivírus",
  limpeza_temporarios: "Verificar limpeza de temporários",
  ativacao_windows_office: "Verificar ativação Windows/Office",
  hostname_correto: "Hostname correto",
  problema_reincidente: "Problema reincidente",
} as const;

const ROTULOS_ANTES = {
  print_impressoras_instaladas: "Print das impressoras instaladas",
  print_programas_instalados: "Print de programas instalados",
  print_pastas_email_copia_psts: "Print das pastas de e-mail e cópia das PSTs",
  print_area_trabalho: "Print da área de trabalho",
  copia_perfil_usuario: "Cópia do perfil do usuário",
} as const;

const ROTULOS_DEPOIS = {
  impressoras_instaladas_testadas: "Impressoras instaladas e testadas",
  programas_instalados_testados: "Programas instalados e testados",
  pastas_email_psts_restauradas_email_ok: "Pastas/PSTs restauradas e e-mail testado",
  area_trabalho_restaurada: "Área de trabalho restaurada",
  perfil_usuario_restaurado: "Perfil do usuário restaurado",
  testes_usuario_validados: "Testes validados pelo usuário",
} as const;

export function usarSolicitanteComoAcompanhante(dados: RatDasaSnapshotV1): RatDasaSnapshotV1 {
  return {
    ...dados,
    cliente: { ...dados.cliente, nome_colaborador_acompanhante: dados.local.solicitante },
  };
}

function Campo({ rotulo, valor, onChange, tipo = "text", obrigatorio = false }: {
  rotulo: string;
  valor: string;
  onChange: (valor: string) => void;
  tipo?: string;
  obrigatorio?: boolean;
}) {
  return <label>{rotulo}{obrigatorio ? <span className="required-mark"> *</span> : null}
    <input type={tipo} value={valor} onChange={(evento) => onChange(evento.target.value)} />
  </label>;
}

function Texto({ rotulo, valor, onChange, obrigatorio = false, linhas = 3 }: {
  rotulo: string;
  valor: string;
  onChange: (valor: string) => void;
  obrigatorio?: boolean;
  linhas?: number;
}) {
  return <label>{rotulo}{obrigatorio ? <span className="required-mark"> *</span> : null}
    <textarea rows={linhas} value={valor} onChange={(evento) => onChange(evento.target.value)} />
  </label>;
}

function Opcional({ titulo, resumo, children }: { titulo: string; resumo: string; children: ReactNode }) {
  return <details className="dasa-collapsible">
    <summary><span><strong>{titulo}</strong><small>{resumo}</small></span><ChevronDown size={18} /></summary>
    <div className="dasa-collapsible-body">{children}</div>
  </details>;
}

function GradeChecks<T extends Record<string, boolean>>({ valores, rotulos, onChange }: {
  valores: T;
  rotulos: { [K in keyof T]: string };
  onChange: (chave: keyof T, marcado: boolean) => void;
}) {
  return <div className="dasa-check-grid">{(Object.keys(rotulos) as Array<keyof T>).map((chave) =>
    <label key={String(chave)}><input type="checkbox" checked={valores[chave]} onChange={(evento) => onChange(chave, evento.target.checked)} />{rotulos[chave]}</label>)}</div>;
}

export function RatDasaForm({ chamadoId, inicial, persistenciaLocal = false, versoes = [] }: {
  chamadoId: number;
  inicial: RatDasaSnapshotV1;
  persistenciaLocal?: boolean;
  versoes?: RatRegistro[];
}) {
  const router = useRouter();
  const [dados, setDados] = useState(inicial);
  const [pendencias, setPendencias] = useState<PendenciaRatDasa[]>([]);
  const [erro, setErro] = useState("");
  const [pendente, setPendente] = useState(false);
  const [urlPrevia, setUrlPrevia] = useState("");
  const [sucesso, setSucesso] = useState("");

  useEffect(() => () => {
    if (urlPrevia) URL.revokeObjectURL(urlPrevia);
  }, [urlPrevia]);

  function atualizarLocal<K extends keyof RatDasaSnapshotV1["local"]>(campo: K, valor: RatDasaSnapshotV1["local"][K]) {
    setDados((atual) => ({ ...atual, local: { ...atual.local, [campo]: valor } }));
  }
  function atualizarEquipamento<K extends keyof RatDasaSnapshotV1["equipamento"]>(campo: K, valor: RatDasaSnapshotV1["equipamento"][K]) {
    setDados((atual) => ({ ...atual, equipamento: { ...atual.equipamento, [campo]: valor } }));
  }
  function atualizarAtendimento<K extends keyof RatDasaSnapshotV1["atendimento"]>(campo: K, valor: RatDasaSnapshotV1["atendimento"][K]) {
    setDados((atual) => ({ ...atual, atendimento: { ...atual.atendimento, [campo]: valor } }));
  }
  function atualizarCliente<K extends keyof RatDasaSnapshotV1["cliente"]>(campo: K, valor: RatDasaSnapshotV1["cliente"][K]) {
    setDados((atual) => ({ ...atual, cliente: { ...atual.cliente, [campo]: valor } }));
  }
  function atualizarTecnico<K extends keyof RatDasaSnapshotV1["tecnico"]>(campo: K, valor: RatDasaSnapshotV1["tecnico"][K]) {
    setDados((atual) => ({ ...atual, tecnico: { ...atual.tecnico, [campo]: valor } }));
  }
  function atualizarChecklistAplicado(chave: keyof RatDasaSnapshotV1["atendimento"]["checklist_aplicado"], marcado: boolean) {
    setDados((atual) => ({ ...atual, atendimento: { ...atual.atendimento, checklist_aplicado: { ...atual.atendimento.checklist_aplicado, [chave]: marcado } } }));
  }
  function atualizarChecklistFormatacao(grupo: "antes" | "depois", chave: string, marcado: boolean) {
    setDados((atual) => ({
      ...atual,
      atendimento: {
        ...atual.atendimento,
        checklist_formatacao: {
          ...atual.atendimento.checklist_formatacao,
          [grupo]: { ...atual.atendimento.checklist_formatacao[grupo], [chave]: marcado },
        },
      },
    }));
  }

  async function gerar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const faltantes = listarPendenciasRatDasaV1(dados);
    setPendencias(faltantes);
    setErro("");
    setSucesso("");
    if (faltantes.length > 0) return;
    setPendente(true);
    try {
      const resposta = await fetch(
        persistenciaLocal ? `/api/chamados/${chamadoId}/rat` : "/api/rat/dasa/preview",
        {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(persistenciaLocal ? { dados } : dados),
        },
      );
      if (!resposta.ok) {
        const resultado = await resposta.json();
        throw new Error(resultado.erro || "Não foi possível gerar a RAT DASA.");
      }
      if (persistenciaLocal) {
        const rat = await resposta.json();
        setSucesso(`RAT DASA versão ${rat.versao} gerada na homologação local.`);
        router.refresh();
        return;
      }
      const novaUrl = URL.createObjectURL(await resposta.blob());
      setUrlPrevia((anterior) => {
        if (anterior) URL.revokeObjectURL(anterior);
        return novaUrl;
      });
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Não foi possível gerar a RAT DASA.");
    } finally {
      setPendente(false);
    }
  }

  return <>
    <form className="form-card dasa-form" onSubmit={gerar}>
      <div className="section-heading"><span>D</span><div><h2>Preparação da RAT DASA</h2><p>{persistenciaLocal ? "Homologação com versionamento na infraestrutura local." : "Revise os dados e gere apenas uma prévia local."}</p></div></div>
      <p className="rat-warning">{persistenciaLocal
        ? "Modo local: a RAT cria uma versão e envia o PDF somente para o Supabase local. Assinaturas opcionais são incorporadas quando houver referência compatível."
        : "A prévia não cria versão, não envia arquivo e não altera o chamado. Assinaturas permanecem opcionais e não são incluídas nesta simulação."}</p>

      <section className="dasa-section"><h3>1. Local</h3>
        <div className="review-grid"><Campo rotulo="Unidade/nome" valor={dados.local.unidade_nome} onChange={(valor) => atualizarLocal("unidade_nome", valor)} obrigatorio />
          <Campo rotulo="Solicitante do chamado" valor={dados.local.solicitante} onChange={(valor) => atualizarLocal("solicitante", valor)} /></div>
        <p className="field-hint">O solicitante pertence ao chamado e não é automaticamente considerado acompanhante.</p>
        <div className="review-grid"><Campo rotulo="Endereço" valor={dados.local.endereco} onChange={(valor) => atualizarLocal("endereco", valor)} obrigatorio />
          <Campo rotulo="Cidade" valor={dados.local.cidade} onChange={(valor) => atualizarLocal("cidade", valor)} obrigatorio />
          <Campo rotulo="Estado" valor={dados.local.estado} onChange={(valor) => atualizarLocal("estado", valor)} obrigatorio />
          <Campo rotulo="Telefone" valor={dados.local.telefone} onChange={(valor) => atualizarLocal("telefone", valor)} /></div>
      </section>

      <section className="dasa-section"><h3>2. Atendimento</h3>
        <label>Tipo de atendimento <span className="required-mark">*</span><select value={dados.atendimento.tipo} onChange={(evento) => atualizarAtendimento("tipo", evento.target.value as RatDasaSnapshotV1["atendimento"]["tipo"])}>
          <option value="">Selecione</option>{TIPOS_ATENDIMENTO_DASA.map((tipo) => <option key={tipo} value={tipo}>{ROTULOS_ATENDIMENTO[tipo]}</option>)}</select></label>
      </section>

      <Opcional titulo="3. Equipamento detalhado" resumo="Patrimônio, serial, fabricante, modelo e tipo">
        <div className="review-grid"><Campo rotulo="Chamado Moebius" valor={dados.equipamento.chamado_moebius} onChange={(valor) => atualizarEquipamento("chamado_moebius", valor)} obrigatorio />
          <Campo rotulo="Chamado CA" valor={dados.equipamento.chamado_ca} onChange={(valor) => atualizarEquipamento("chamado_ca", valor)} />
          <Campo rotulo="Patrimônio" valor={dados.equipamento.patrimonio} onChange={(valor) => atualizarEquipamento("patrimonio", valor)} />
          <Campo rotulo="Service Tag/Serial" valor={dados.equipamento.service_tag_serial} onChange={(valor) => atualizarEquipamento("service_tag_serial", valor)} />
          <Campo rotulo="Marca" valor={dados.equipamento.marca} onChange={(valor) => atualizarEquipamento("marca", valor)} />
          <Campo rotulo="Modelo" valor={dados.equipamento.modelo} onChange={(valor) => atualizarEquipamento("modelo", valor)} /></div>
        <label>Tipo de equipamento<select value={dados.equipamento.tipo} onChange={(evento) => atualizarEquipamento("tipo", evento.target.value as RatDasaSnapshotV1["equipamento"]["tipo"])}><option value="">Não informado</option>{TIPOS_EQUIPAMENTO_DASA.map((tipo) => <option key={tipo}>{tipo}</option>)}</select></label>
        {dados.equipamento.tipo === "Outro" ? <Campo rotulo="Descreva o equipamento" valor={dados.equipamento.tipo_outro} onChange={(valor) => atualizarEquipamento("tipo_outro", valor)} obrigatorio /> : null}
      </Opcional>

      <section className="dasa-section"><h3>4. Diagnóstico</h3>
        <Texto rotulo="Defeito informado" valor={dados.atendimento.defeito_informado} onChange={(valor) => atualizarAtendimento("defeito_informado", valor)} obrigatorio />
        <Texto rotulo="Defeito constatado" valor={dados.atendimento.defeito_constatado} onChange={(valor) => atualizarAtendimento("defeito_constatado", valor)} obrigatorio />
        <Texto rotulo="Solução aplicada" valor={dados.atendimento.solucao_aplicada} onChange={(valor) => atualizarAtendimento("solucao_aplicada", valor)} obrigatorio linhas={4} />
      </section>

      <Opcional titulo="5. Checklist aplicado" resumo="Nenhum item é marcado automaticamente"><GradeChecks valores={dados.atendimento.checklist_aplicado} rotulos={ROTULOS_CHECKLIST} onChange={atualizarChecklistAplicado} /></Opcional>
      <Opcional titulo="Checklist de formatação" resumo="Registros opcionais antes e depois"><h4>Antes</h4><GradeChecks valores={dados.atendimento.checklist_formatacao.antes} rotulos={ROTULOS_ANTES} onChange={(chave, marcado) => atualizarChecklistFormatacao("antes", String(chave), marcado)} /><h4>Depois</h4><GradeChecks valores={dados.atendimento.checklist_formatacao.depois} rotulos={ROTULOS_DEPOIS} onChange={(chave, marcado) => atualizarChecklistFormatacao("depois", String(chave), marcado)} /></Opcional>

      <section className="dasa-section"><h3>6. Resultado</h3><div className="dasa-check-grid">
        {([ ["problema_solucionado", "Problema solucionado"], ["garantia_acionada", "Garantia acionada"], ["retirado_laboratorio", "Retirado para laboratório"], ["retirada_estoque_ti", "Retirada pelo Estoque TI"], ["visita_improdutiva", "Visita improdutiva"] ] as const).map(([campo, rotulo]) =>
          <label key={campo}><input type="checkbox" checked={dados.atendimento[campo] === true} onChange={(evento) => atualizarAtendimento(campo, evento.target.checked)} />{rotulo}</label>)}</div>
        <label>Avaliação do atendimento<select value={dados.cliente.avaliacao} onChange={(evento) => atualizarCliente("avaliacao", evento.target.value as RatDasaSnapshotV1["cliente"]["avaliacao"])}><option value="">Não informada</option>{AVALIACOES_DASA.map((item) => <option key={item} value={item}>{item[0] + item.slice(1).toLocaleLowerCase("pt-BR")}</option>)}</select></label>
      </section>

      <Opcional titulo="Laudo" resumo="Preencher somente quando aplicável"><label>Laudado?<select value={dados.laudo.laudado === null ? "" : String(dados.laudo.laudado)} onChange={(evento) => setDados((atual) => ({ ...atual, laudo: { ...atual.laudo, laudado: evento.target.value === "" ? null : evento.target.value === "true" } }))}><option value="">Não informado</option><option value="true">Sim</option><option value="false">Não</option></select></label>
        {dados.laudo.laudado === true ? <label>Motivo do laudo <span className="required-mark">*</span><select value={dados.laudo.motivo} onChange={(evento) => setDados((atual) => ({ ...atual, laudo: { ...atual.laudo, motivo: evento.target.value as RatDasaSnapshotV1["laudo"]["motivo"] } }))}><option value="">Selecione</option>{MOTIVOS_LAUDO_DASA.map((motivo) => <option key={motivo} value={motivo}>{motivo.replaceAll("_", " ")}</option>)}</select></label> : null}
        <Campo rotulo="Centro de custo" valor={dados.laudo.centro_custo} onChange={(valor) => setDados((atual) => ({ ...atual, laudo: { ...atual.laudo, centro_custo: valor } }))} /></Opcional>

      <section className="dasa-section"><h3>7. Colaborador acompanhante</h3>
        <Campo rotulo="Colaborador que acompanhou o atendimento" valor={dados.cliente.nome_colaborador_acompanhante} onChange={(valor) => atualizarCliente("nome_colaborador_acompanhante", valor)} obrigatorio />
        <button className="secondary-button use-requester-button" type="button" disabled={!dados.local.solicitante} onClick={() => setDados((atual) => usarSolicitanteComoAcompanhante(atual))}><UserRoundCheck size={17} />Usar solicitante como acompanhante</button>
        <p className="field-hint">A cópia só acontece mediante esta ação explícita.</p>
      </section>

      <section className="dasa-section"><h3>8. Técnico e horários</h3>
        <Campo rotulo="Nome do técnico" valor={dados.tecnico.nome_tecnico} onChange={(valor) => atualizarTecnico("nome_tecnico", valor)} obrigatorio />
        <p className="field-hint">Preenchido pela configuração atual do técnico, sem nome fixo no código.</p>
        <div className="dasa-time-grid"><Campo rotulo="Data de início" tipo="date" valor={dados.tecnico.inicio_data} onChange={(valor) => atualizarTecnico("inicio_data", valor)} obrigatorio />
          <Campo rotulo="Hora de início" tipo="time" valor={dados.tecnico.inicio_hora} onChange={(valor) => atualizarTecnico("inicio_hora", valor)} obrigatorio />
          <Campo rotulo="Data de término" tipo="date" valor={dados.tecnico.termino_data} onChange={(valor) => atualizarTecnico("termino_data", valor)} obrigatorio />
          <Campo rotulo="Hora de término" tipo="time" valor={dados.tecnico.termino_hora} onChange={(valor) => atualizarTecnico("termino_hora", valor)} obrigatorio /></div>
      </section>

      <Opcional titulo="Demais opcionais" resumo="Marca, setor, observações e encaminhamento"><div className="review-grid"><Campo rotulo="Marca da unidade" valor={dados.local.marca} onChange={(valor) => atualizarLocal("marca", valor)} /><Campo rotulo="Setor" valor={dados.local.setor} onChange={(valor) => atualizarLocal("setor", valor)} /></div><Texto rotulo="Observações do defeito" valor={dados.atendimento.observacoes_defeito} onChange={(valor) => atualizarAtendimento("observacoes_defeito", valor)} /><Texto rotulo="Observações da solução" valor={dados.atendimento.observacoes_solucao} onChange={(valor) => atualizarAtendimento("observacoes_solucao", valor)} /><Campo rotulo="Chamado encaminhado para" valor={dados.atendimento.encaminhado_para} onChange={(valor) => atualizarAtendimento("encaminhado_para", valor)} /></Opcional>

      {pendencias.length > 0 ? <div className="dasa-validation" role="alert"><strong>Faltam {pendencias.length} informações para gerar a RAT</strong><ul>{pendencias.map((item) => <li key={item.campo}>{item.campo}: {item.mensagem}</li>)}</ul></div> : null}
      {erro ? <p className="feedback error" role="alert">{erro}</p> : null}
      {sucesso ? <p className="feedback success" role="status">{sucesso}</p> : null}
      <button className="primary-button dasa-preview-button" disabled={pendente}>{pendente
        ? <><LoaderCircle className="spin" size={17} />Gerando...</>
        : <><FileDown size={17} />{persistenciaLocal ? "Gerar RAT DASA" : "Gerar prévia da RAT"}</>}</button>
    </form>

    {urlPrevia ? <section className="detail-card dasa-preview" aria-live="polite"><div className="section-heading"><span>PDF</span><div><h2>Prévia local</h2><p>Este arquivo existe apenas nesta sessão do navegador.</p></div></div><a className="secondary-button" href={urlPrevia} target="_blank" rel="noreferrer"><ExternalLink size={17} />Abrir prévia em nova aba</a><iframe title="Prévia da RAT DASA" src={urlPrevia} /></section> : null}
    {versoes.length > 0 ? <section className="detail-card"><div className="section-heading"><span>PDF</span><div><h2>Versões DASA geradas</h2><p>Cada arquivo permanece preservado.</p></div></div><div className="rat-versions">{versoes.map((rat) =>
      <div key={rat.id}><strong>Versão {rat.versao}{rat.atual ? " · Atual" : ""}</strong><span>{new Date(rat.gerado_em).toLocaleString("pt-BR")}</span><RatArquivoAcoes chamadoId={chamadoId} ratId={rat.id} nomeArquivo={nomeArquivoRat(dados.equipamento.chamado_moebius, rat.versao)} /></div>)}</div></section> : null}
  </>;
}
