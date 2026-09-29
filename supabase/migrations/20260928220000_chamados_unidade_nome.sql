BEGIN;

ALTER TABLE chamados
ADD COLUMN unidade_nome TEXT;

COMMIT;
