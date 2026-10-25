-- 011 — Encerramento de contrato (S9). Aplicar após 002.
ALTER TABLE contratos
  ADD COLUMN IF NOT EXISTS encerrado_em DATE,
  ADD COLUMN IF NOT EXISTS motivo_encerramento TEXT;
