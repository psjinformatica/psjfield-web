import { NextResponse } from "next/server";

import { interpretarEml } from "@/lib/parser";
import { chamadosService } from "@/lib/server-service";
import type { ChamadoImportacao } from "@/lib/types";

export const runtime = "nodejs";

const editaveis: (keyof ChamadoImportacao)[] = [
  "numero_chamado", "cliente", "projeto", "data_agendada", "hora_agendada",
  "contato", "telefone", "endereco", "cidade", "estado", "atividade", "descricao",
  "equipamento", "fabricante", "modelo", "patrimonio_ae", "numero_serie",
  "valor_base", "horas_incluidas", "valor_hora_adicional", "observacoes",
];

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const arquivo = form.get("arquivo");
    if (!(arquivo instanceof File)) throw new Error("Arquivo .eml não informado.");
    if (arquivo.size > 10 * 1024 * 1024) throw new Error("O arquivo excede o limite de 10 MB.");
    const previa = await interpretarEml(new Uint8Array(await arquivo.arrayBuffer()), arquivo.name);
    const dados = JSON.parse(String(form.get("dados") || "{}")) as Record<string, unknown>;
    const revisado = { ...previa.chamado };
    for (const campo of editaveis) {
      const valor = dados[campo];
      if (typeof valor === "string" || valor === null) {
        Object.assign(revisado, { [campo]: valor });
      }
    }
    for (const campo of ["valor_base", "horas_incluidas", "valor_hora_adicional"] as const) {
      if (revisado[campo] === "") revisado[campo] = null;
      if (revisado[campo] !== null && !Number.isFinite(Number(revisado[campo]))) {
        throw new Error(`Valor inválido no campo ${campo}.`);
      }
    }
    if (revisado.data_agendada && !/^\d{4}-\d{2}-\d{2}$/.test(revisado.data_agendada)) {
      throw new Error("Data agendada inválida.");
    }
    if (revisado.hora_agendada && !/^([01]\d|2[0-3]):[0-5]\d$/.test(revisado.hora_agendada)) {
      throw new Error("Hora agendada inválida.");
    }
    revisado.status = revisado.data_agendada || revisado.hora_agendada ? "Agendado" : "Recebido";
    revisado.atualizado_em = new Date().toISOString();
    const id = await chamadosService.importar(revisado, arquivo.name);
    return NextResponse.json({ id });
  } catch (erro) {
    const mensagem = erro instanceof Error ? erro.message : "Não foi possível importar.";
    const status = mensagem.includes("já foi importado") ? 409 : 400;
    return NextResponse.json({ erro: mensagem }, { status });
  }
}
