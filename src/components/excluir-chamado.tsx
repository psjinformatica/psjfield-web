"use client";

import { Trash2 } from "lucide-react";
import { useState } from "react";

import { excluirChamadoAction } from "@/app/actions";

export function ExcluirChamado({ id, numero }: { id: number; numero: string }) {
  const [confirmando, setConfirmando] = useState(false);
  if (!confirmando) {
    return (
      <button className="danger-link" onClick={() => setConfirmando(true)}>
        <Trash2 size={17} /> Excluir chamado
      </button>
    );
  }
  return (
    <div className="delete-confirm">
      <p>Excluir <strong>{numero}</strong> e o hash do e-mail associado?</p>
      <p className="muted">A operação é transacional e não remove outros chamados.</p>
      <div>
        <button className="secondary-button" onClick={() => setConfirmando(false)}>Cancelar</button>
        <form action={excluirChamadoAction.bind(null, id)}>
          <button className="danger-button">Confirmar exclusão</button>
        </form>
      </div>
    </div>
  );
}
