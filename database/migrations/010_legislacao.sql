-- 010 — Acompanhamento do monitor de legislação (S8). Aplicar após 006.
CREATE TABLE IF NOT EXISTS legislacao_acompanhamento (
  norma_id TEXT PRIMARY KEY,
  titulo TEXT,
  status TEXT NOT NULL CHECK (status IN ('nova','em_analise','concluida','nao_se_aplica')),
  atualizado_em TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE legislacao_acompanhamento ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON legislacao_acompanhamento TO authenticated;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='legislacao_acompanhamento' AND policyname='legislacao_select') THEN
    CREATE POLICY legislacao_select ON legislacao_acompanhamento FOR SELECT USING (perfil_atual() IS NOT NULL);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='legislacao_acompanhamento' AND policyname='legislacao_insert') THEN
    CREATE POLICY legislacao_insert ON legislacao_acompanhamento FOR INSERT WITH CHECK (perfil_atual() IN ('admin','operador'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='legislacao_acompanhamento' AND policyname='legislacao_update') THEN
    CREATE POLICY legislacao_update ON legislacao_acompanhamento FOR UPDATE USING (perfil_atual() IN ('admin','operador'));
  END IF;
END $$;
