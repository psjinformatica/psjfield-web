"use client";

import { useEffect } from "react";

import { marcarChamadoVisualizadoAction } from "@/app/actions";

export function MarcarChamadoAcessado({ id }: { id: number }) {
  useEffect(() => {
    void marcarChamadoVisualizadoAction(id).catch((erro: unknown) => {
      console.error("Não foi possível registrar a visualização do chamado.", erro);
    });
  }, [id]);
  return null;
}
