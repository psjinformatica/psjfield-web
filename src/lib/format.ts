export function formatarData(valor: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor || "")) return valor || "";
  const [ano, mes, dia] = valor.split("-");
  return `${dia}/${mes}/${ano}`;
}

export function formatarDataRelativa(valor: string, referencia = new Date()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor || "")) return formatarData(valor);
  const chave = (data: Date) => {
    const partes = new Intl.DateTimeFormat("pt-BR", {
      timeZone: "America/Sao_Paulo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(data);
    const parte = (tipo: Intl.DateTimeFormatPartTypes) =>
      partes.find((item) => item.type === tipo)?.value || "";
    return `${parte("year")}-${parte("month")}-${parte("day")}`;
  };
  const amanha = new Date(referencia.getTime() + 24 * 60 * 60 * 1000);
  if (valor === chave(referencia)) return "Hoje";
  if (valor === chave(amanha)) return "Amanhã";
  return formatarData(valor);
}

export function formatarCidade(cidade: string, estado: string) {
  if (!cidade) return "";
  return estado ? `${cidade}/${estado}` : cidade;
}

export function formatarDataHora(valor: string) {
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return valor;
  const partes = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(data);
  const parte = (tipo: Intl.DateTimeFormatPartTypes) =>
    partes.find((item) => item.type === tipo)?.value || "";
  return `${parte("day")}/${parte("month")}/${parte("year")} às ${parte("hour")}:${parte("minute")}`;
}

export function normalizarHorarioInput(valor: string) {
  const partes = /^(\d{2}):(\d{2})/.exec(valor || "");
  return partes ? `${partes[1]}:${partes[2]}` : "";
}

export function formatarMoeda(valor: string | null) {
  if (valor === null || valor === "") return "";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(valor));
}
