BEGIN;

CREATE TABLE IF NOT EXISTS assinaturas_cliente (
  chamado_id BIGINT PRIMARY KEY REFERENCES chamados(id) ON DELETE CASCADE,
  nome_responsavel TEXT NOT NULL,
  documento_responsavel TEXT NOT NULL DEFAULT '',
  caminho_assinatura TEXT NOT NULL,
  assinado_em TIMESTAMPTZ NOT NULL,
  atualizado_em TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS assinatura_tecnico (
  id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  nome_tecnico TEXT NOT NULL,
  caminho_assinatura TEXT NOT NULL,
  atualizado_em TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS pendencias_storage (
  id BIGSERIAL PRIMARY KEY,
  bucket TEXT NOT NULL,
  caminho TEXT NOT NULL,
  motivo TEXT NOT NULL,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processado_em TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_pendencias_storage_abertas
ON pendencias_storage (criado_em)
WHERE processado_em IS NULL;

CREATE OR REPLACE FUNCTION registrar_limpeza_assinatura_cliente()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO pendencias_storage (bucket, caminho, motivo)
  VALUES ('assinaturas', OLD.caminho_assinatura, 'Exclusão do chamado');
  RETURN OLD;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_assinatura_cliente_pendente_exclusao'
  ) THEN
    CREATE TRIGGER trg_assinatura_cliente_pendente_exclusao
    BEFORE DELETE ON assinaturas_cliente
    FOR EACH ROW EXECUTE FUNCTION registrar_limpeza_assinatura_cliente();
  END IF;
END;
$$;

INSERT INTO storage.buckets (id, name, public)
VALUES ('assinaturas', 'assinaturas', false)
ON CONFLICT (id) DO UPDATE SET public = false;

COMMIT;
