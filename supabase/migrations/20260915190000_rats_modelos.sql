BEGIN;

ALTER TABLE rats
  ADD COLUMN IF NOT EXISTS modelo_rat TEXT NOT NULL DEFAULT 'claro',
  ADD COLUMN IF NOT EXISTS modelo_versao INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS schema_versao INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS template_hash CHAR(64) NOT NULL
    DEFAULT '1cb582e940b46a0f956d7badba83fdcb0148aacbac5038ad641f0fbc5cbc87d2',
  ADD COLUMN IF NOT EXISTS assinaturas_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'rats_modelo_rat_valido') THEN
    ALTER TABLE rats ADD CONSTRAINT rats_modelo_rat_valido
      CHECK (modelo_rat IN ('claro', 'dasa'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'rats_modelo_versao_valida') THEN
    ALTER TABLE rats ADD CONSTRAINT rats_modelo_versao_valida CHECK (modelo_versao > 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'rats_schema_versao_valida') THEN
    ALTER TABLE rats ADD CONSTRAINT rats_schema_versao_valida CHECK (schema_versao > 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'rats_template_hash_valido') THEN
    ALTER TABLE rats ADD CONSTRAINT rats_template_hash_valido
      CHECK (template_hash ~ '^[0-9a-f]{64}$');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'rats_assinaturas_snapshot_objeto') THEN
    ALTER TABLE rats ADD CONSTRAINT rats_assinaturas_snapshot_objeto
      CHECK (jsonb_typeof(assinaturas_snapshot) = 'object');
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_rats_chamado_modelo_versao
ON rats (chamado_id, modelo_rat, modelo_versao, schema_versao, versao DESC);

CREATE OR REPLACE FUNCTION proteger_conteudo_rat_emitida()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.id IS DISTINCT FROM OLD.id
    OR NEW.chamado_id IS DISTINCT FROM OLD.chamado_id
    OR NEW.versao IS DISTINCT FROM OLD.versao
    OR NEW.caminho_pdf IS DISTINCT FROM OLD.caminho_pdf
    OR NEW.hash_pdf IS DISTINCT FROM OLD.hash_pdf
    OR NEW.tecnico IS DISTINCT FROM OLD.tecnico
    OR NEW.dados_revisao IS DISTINCT FROM OLD.dados_revisao
    OR NEW.gerado_em IS DISTINCT FROM OLD.gerado_em
    OR NEW.modelo_rat IS DISTINCT FROM OLD.modelo_rat
    OR NEW.modelo_versao IS DISTINCT FROM OLD.modelo_versao
    OR NEW.schema_versao IS DISTINCT FROM OLD.schema_versao
    OR NEW.template_hash IS DISTINCT FROM OLD.template_hash
    OR NEW.assinaturas_snapshot IS DISTINCT FROM OLD.assinaturas_snapshot
  THEN
    RAISE EXCEPTION 'O conteúdo de uma RAT emitida é imutável';
  END IF;
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_proteger_conteudo_rat_emitida') THEN
    CREATE TRIGGER trg_proteger_conteudo_rat_emitida
    BEFORE UPDATE ON rats
    FOR EACH ROW EXECUTE FUNCTION proteger_conteudo_rat_emitida();
  END IF;
END;
$$;

COMMIT;
