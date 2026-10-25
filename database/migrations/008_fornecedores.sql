-- 008 — Fornecedores, KYC e SLA (S7). Aplicar após 006.
-- Cada fornecedor é uma linha; o conteúdo (KYC, certidões, SLAs e medições)
-- fica em JSONB, e o que é "situação" (vencida, descumprida) é sempre calculado.

CREATE TABLE IF NOT EXISTS fornecedores (
  id TEXT PRIMARY KEY,
  dados JSONB NOT NULL,
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE fornecedores ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON fornecedores TO authenticated;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='fornecedores' AND policyname='fornecedores_select') THEN
    CREATE POLICY fornecedores_select ON fornecedores FOR SELECT USING (perfil_atual() IS NOT NULL);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='fornecedores' AND policyname='fornecedores_insert') THEN
    CREATE POLICY fornecedores_insert ON fornecedores FOR INSERT WITH CHECK (perfil_atual() IN ('admin','operador'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='fornecedores' AND policyname='fornecedores_update') THEN
    CREATE POLICY fornecedores_update ON fornecedores FOR UPDATE USING (perfil_atual() IN ('admin','operador'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='fornecedores' AND policyname='fornecedores_delete') THEN
    CREATE POLICY fornecedores_delete ON fornecedores FOR DELETE USING (perfil_atual() = 'admin');
  END IF;
END $$;
