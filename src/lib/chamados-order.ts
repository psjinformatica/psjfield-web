export type ChamadoOrdenavel = {
  id: number;
  status: string;
  data_agendada: string;
  hora_agendada: string;
  encerrado_em?: Date | string | null;
  atualizado_em?: Date | string | null;
};

function grupo(status: string) {
  if (status === "Agendado") return 0;
  if (status === "Concluído" || status === "Improdutivo") return 1;
  return 2;
}

function dataAgendada(valor: string | null | undefined) {
  if (!valor) return null;
  const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(valor);
  if (!partes) return null;
  const ano = Number(partes[1]);
  const mes = Number(partes[2]);
  const dia = Number(partes[3]);
  const instante = Date.UTC(ano, mes - 1, dia);
  const data = new Date(instante);
  return data.getUTCFullYear() === ano
    && data.getUTCMonth() === mes - 1
    && data.getUTCDate() === dia
    ? instante
    : null;
}

function horaAgendada(valor: string | null | undefined) {
  if (!valor) return null;
  const partes = /^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/.exec(valor);
  if (!partes) return null;
  return Number(partes[1]) * 3_600 + Number(partes[2]) * 60 + Number(partes[3] ?? 0);
}

function instante(valor: Date | string | null | undefined) {
  if (!valor) return null;
  const resultado = valor instanceof Date ? valor.getTime() : Date.parse(valor);
  return Number.isFinite(resultado) ? resultado : null;
}

function compararNullable(a: number | null, b: number | null, direcao: 1 | -1) {
  if (a === null) return b === null ? 0 : 1;
  if (b === null) return -1;
  return (a - b) * direcao;
}

export function compararChamados(a: ChamadoOrdenavel, b: ChamadoOrdenavel) {
  const diferencaGrupo = grupo(a.status) - grupo(b.status);
  if (diferencaGrupo) return diferencaGrupo;

  if (a.status === "Agendado" && b.status === "Agendado") {
    const diferencaData = compararNullable(
      dataAgendada(a.data_agendada),
      dataAgendada(b.data_agendada),
      1,
    );
    if (diferencaData) return diferencaData;

    const diferencaHora = compararNullable(
      horaAgendada(a.hora_agendada),
      horaAgendada(b.hora_agendada),
      1,
    );
    if (diferencaHora) return diferencaHora;
  } else if (
    (a.status === "Concluído" || a.status === "Improdutivo")
    && (b.status === "Concluído" || b.status === "Improdutivo")
  ) {
    const diferencaEncerramento = compararNullable(
      instante(a.encerrado_em),
      instante(b.encerrado_em),
      -1,
    );
    if (diferencaEncerramento) return diferencaEncerramento;
  } else {
    const diferencaAtualizacao = compararNullable(
      instante(a.atualizado_em),
      instante(b.atualizado_em),
      -1,
    );
    if (diferencaAtualizacao) return diferencaAtualizacao;
  }

  return b.id - a.id;
}

export function ordenarChamados<T extends ChamadoOrdenavel>(chamados: T[]) {
  return [...chamados].sort(compararChamados);
}
