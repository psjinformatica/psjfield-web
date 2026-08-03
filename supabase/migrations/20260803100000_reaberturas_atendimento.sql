BEGIN;

CREATE TABLE IF NOT EXISTS reaberturas_atendimento (
  id BIGSERIAL PRIMARY KEY,
  chamado_id BIGINT NOT NULL REFERENCES chamados(id) ON DELETE CASCADE,
  status_anterior TEXT NOT NULL CHECK (status_anterior IN ('Concluído', 'Improdutivo', 'Cancelado')),
  motivo TEXT NOT NULL CHECK (LENGTH(BTRIM(motivo)) > 0),
  reaberto_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reaberturas_atendimento_chamado_data
ON reaberturas_atendimento (chamado_id, reaberto_em DESC);

COMMIT;
