BEGIN;

CREATE TABLE IF NOT EXISTS rats (
  id UUID PRIMARY KEY,
  chamado_id BIGINT NOT NULL REFERENCES chamados(id) ON DELETE CASCADE,
  versao INTEGER NOT NULL CHECK (versao > 0),
  caminho_pdf TEXT NOT NULL UNIQUE,
  hash_pdf CHAR(64) NOT NULL,
  tecnico TEXT NOT NULL DEFAULT '',
  status_rat TEXT NOT NULL DEFAULT 'Gerada' CHECK (status_rat IN ('Gerada', 'Substituída')),
  dados_revisao JSONB NOT NULL,
  atual BOOLEAN NOT NULL DEFAULT TRUE,
  gerado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (chamado_id, versao)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_rats_uma_atual_por_chamado
ON rats (chamado_id) WHERE atual;

CREATE INDEX IF NOT EXISTS idx_rats_chamado_versao
ON rats (chamado_id, versao DESC);

CREATE OR REPLACE FUNCTION registrar_limpeza_rat()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO pendencias_storage (bucket, caminho, motivo)
  VALUES ('rats', OLD.caminho_pdf, 'Exclusão de RAT ou chamado');
  RETURN OLD;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_rat_pendente_exclusao') THEN
    CREATE TRIGGER trg_rat_pendente_exclusao
    BEFORE DELETE ON rats
    FOR EACH ROW EXECUTE FUNCTION registrar_limpeza_rat();
  END IF;
END;
$$;

INSERT INTO storage.buckets (id, name, public)
VALUES ('rats', 'rats', false)
ON CONFLICT (id) DO UPDATE SET public = false;

COMMIT;
