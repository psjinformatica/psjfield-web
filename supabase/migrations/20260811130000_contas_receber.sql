BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS contas_receber (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chamado_id BIGINT NOT NULL UNIQUE REFERENCES chamados(id) ON DELETE RESTRICT,
  numero_chamado_snapshot TEXT NOT NULL,
  encerrado_em TIMESTAMPTZ NOT NULL,
  hora_inicio_snapshot TEXT NOT NULL DEFAULT '',
  hora_fim_snapshot TEXT NOT NULL DEFAULT '',
  duracao_minutos INTEGER CHECK (duracao_minutos IS NULL OR duracao_minutos >= 0),
  horas_adicionais INTEGER CHECK (horas_adicionais IS NULL OR horas_adicionais >= 0),
  valor_base NUMERIC(12,2) NOT NULL CHECK (valor_base >= 0),
  valor_hora_adicional NUMERIC(12,2) NOT NULL CHECK (valor_hora_adicional >= 0),
  valor_adicional NUMERIC(12,2) CHECK (valor_adicional IS NULL OR valor_adicional >= 0),
  valor_total NUMERIC(12,2) CHECK (valor_total IS NULL OR valor_total >= 0),
  regra_preco TEXT NOT NULL,
  origem TEXT NOT NULL CHECK (origem IN ('AUTOMATICO', 'HISTORICO_MANUAL')),
  prazo_dias INTEGER NOT NULL DEFAULT 30 CHECK (prazo_dias >= 0),
  situacao TEXT NOT NULL CHECK (situacao IN ('A_RECEBER', 'EM_REVISAO', 'RECEBIDO')),
  revisao_pendente BOOLEAN NOT NULL DEFAULT FALSE,
  recebido_em DATE,
  valor_recebido NUMERIC(12,2) CHECK (valor_recebido IS NULL OR valor_recebido > 0),
  observacoes TEXT NOT NULL DEFAULT '',
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ck_contas_receber_calculo_consistente CHECK (
    (duracao_minutos IS NULL AND horas_adicionais IS NULL AND valor_adicional IS NULL AND valor_total IS NULL AND revisao_pendente)
    OR
    (duracao_minutos IS NOT NULL AND horas_adicionais IS NOT NULL AND valor_adicional IS NOT NULL AND valor_total IS NOT NULL)
  ),
  CONSTRAINT ck_contas_receber_recebimento_consistente CHECK (
    (situacao = 'RECEBIDO' AND recebido_em IS NOT NULL AND valor_recebido IS NOT NULL)
    OR
    (situacao <> 'RECEBIDO' AND recebido_em IS NULL AND valor_recebido IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_contas_receber_situacao_previsao
ON contas_receber (situacao, ((encerrado_em AT TIME ZONE 'America/Sao_Paulo')::date + prazo_dias));

CREATE INDEX IF NOT EXISTS idx_contas_receber_encerrado_em
ON contas_receber (encerrado_em DESC);

COMMIT;
