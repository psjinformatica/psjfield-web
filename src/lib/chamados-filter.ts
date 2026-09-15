import type { ChamadoResumo } from "@/lib/types";

export function filtrarChamados(chamados: ChamadoResumo[], busca: string, status: string) {
  const termo = busca.trim().toLocaleLowerCase("pt-BR");
  return chamados.filter((chamado) => {
    const correspondeStatus = status === "Todos" || chamado.status === status;
    const alvo = [
      chamado.numero_chamado,
      chamado.cliente,
      chamado.projeto,
      chamado.cidade,
      chamado.atividade,
    ].join(" ").toLocaleLowerCase("pt-BR");
    return correspondeStatus && (!termo || alvo.includes(termo));
  });
}
