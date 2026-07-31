export function formatarData(valor: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor || "")) return valor || "";
  const [ano, mes, dia] = valor.split("-");
  return `${dia}/${mes}/${ano}`;
}

export function formatarCidade(cidade: string, estado: string) {
  if (!cidade) return "";
  return estado ? `${cidade}/${estado}` : cidade;
}

export function formatarMoeda(valor: string | null) {
  if (valor === null || valor === "") return "";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(valor));
}
