-- 006 — Trilha de auditoria encadeada por hash (S6). Aplicar após 002.
-- Cada ação relevante vira um registro imutável; o hash inclui o hash do
-- registro anterior, formando uma cadeia verificável (livro-razão encadeado).

CREATE TABLE IF NOT EXISTS trilha_auditoria (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  seq BIGINT NOT NULL,
  tipo TEXT NOT NULL,
  entidade TEXT,
  resumo TEXT,
  hash_anterior TEXT NOT NULL,
  hash TEXT NOT NULL,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_trilha_seq ON trilha_auditoria(seq);
CREATE UNIQUE INDEX IF NOT EXISTS uq_trilha_hash ON trilha_auditoria(hash);

ALTER TABLE trilha_auditoria ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT ON trilha_auditoria TO authenticated;

-- Todo perfil lê; admin e operador inserem. A trilha nunca é alterada nem
-- apagada pela interface: não há política de UPDATE/DELETE.
DROP POLICY IF EXISTS trilha_auditoria_select ON trilha_auditoria;
CREATE POLICY trilha_auditoria_select ON trilha_auditoria FOR SELECT USING (perfil_atual() IS NOT NULL);
DROP POLICY IF EXISTS trilha_auditoria_insert ON trilha_auditoria;
CREATE POLICY trilha_auditoria_insert ON trilha_auditoria FOR INSERT WITH CHECK (perfil_atual() IN ('admin','operador'));
