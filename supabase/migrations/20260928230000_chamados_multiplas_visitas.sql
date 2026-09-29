BEGIN;

ALTER TABLE public.chamados
  ADD COLUMN visita_numero INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN chamado_raiz_id BIGINT NULL;

ALTER TABLE public.chamados
  ADD CONSTRAINT chamados_visita_numero_positivo
    CHECK (visita_numero > 0),
  ADD CONSTRAINT chamados_visita_origem_coerente
    CHECK (
      (visita_numero = 1 AND chamado_raiz_id IS NULL)
      OR
      (visita_numero > 1 AND chamado_raiz_id IS NOT NULL)
    ),
  ADD CONSTRAINT chamados_raiz_diferente
    CHECK (chamado_raiz_id IS NULL OR chamado_raiz_id <> id),
  ADD CONSTRAINT chamados_raiz_fk
    FOREIGN KEY (chamado_raiz_id)
    REFERENCES public.chamados(id)
    ON DELETE RESTRICT;

CREATE UNIQUE INDEX idx_chamados_raiz_visita
ON public.chamados ((COALESCE(chamado_raiz_id, id)), visita_numero);

COMMIT;
