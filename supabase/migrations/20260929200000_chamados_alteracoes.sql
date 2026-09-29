BEGIN;

CREATE TABLE public.chamados_alteracoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chamado_id BIGINT NOT NULL
    REFERENCES public.chamados(id)
    ON DELETE CASCADE,
  alterado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  origem TEXT NOT NULL DEFAULT 'EDICAO_MANUAL'
    CHECK (origem IN ('EDICAO_MANUAL')),
  escopo TEXT NOT NULL
    CHECK (escopo IN ('SOMENTE_ESTA_VISITA', 'TODAS_VISITAS_RELACIONADAS')),
  campos_alterados TEXT[] NOT NULL
    CHECK (cardinality(campos_alterados) > 0),
  valores_anteriores JSONB NOT NULL
    CHECK (jsonb_typeof(valores_anteriores) = 'object'),
  valores_novos JSONB NOT NULL
    CHECK (jsonb_typeof(valores_novos) = 'object')
);

CREATE INDEX idx_chamados_alteracoes_chamado_data
  ON public.chamados_alteracoes (chamado_id, alterado_em DESC);

ALTER TABLE public.chamados_alteracoes ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.chamados_alteracoes
  FROM PUBLIC, anon, authenticated, service_role;

COMMENT ON TABLE public.chamados_alteracoes IS
  'Trilha das edições cadastrais manuais. A auditoria acompanha o chamado quando ele é legitimamente excluído.';

COMMIT;
