BEGIN;

ALTER TABLE chamados
  ADD COLUMN visualizado_em TIMESTAMPTZ;

-- Os chamados anteriores à adoção do estado global já fazem parte do histórico
-- operacional. O backfill evita apresentá-los como novos após a publicação.
UPDATE chamados
SET visualizado_em = NOW()
WHERE visualizado_em IS NULL;

COMMENT ON COLUMN chamados.visualizado_em IS
  'Instante da primeira visualização bem-sucedida do detalhe do chamado.';

COMMIT;
