"use client";

import { useEffect } from "react";

import { marcarComoAcessado } from "@/lib/chamados-acessados";

export function MarcarChamadoAcessado({ id }: { id: number }) {
  useEffect(() => {
    marcarComoAcessado(id);
  }, [id]);
  return null;
}
