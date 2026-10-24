-- 003 — Aditivos e subcontratos ligados ao contrato-mãe (S3). Aplicar após 002.

DO $$ BEGIN
  CREATE TYPE contrato_natureza AS ENUM ('principal', 'aditivo', 'subcontrato');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE contratos
  ADD COLUMN IF NOT EXISTS contrato_pai_id UUID REFERENCES contratos(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS natureza contrato_natureza NOT NULL DEFAULT 'principal';

CREATE INDEX IF NOT EXISTS idx_contratos_pai ON contratos(contrato_pai_id);

-- O alerta de vencimento continua valendo para aditivos e subcontratos: o gatilho
-- de 002 já cobre qualquer linha de contratos, inclusive as vinculadas.
