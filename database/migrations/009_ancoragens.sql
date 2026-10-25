-- 009 — Ancoragem pública (OpenTimestamps) do selo da trilha. Aplicar após 006.
CREATE TABLE IF NOT EXISTS ancoragens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  seq BIGINT NOT NULL,
  selo TEXT NOT NULL,
  digest TEXT NOT NULL,
  calendario TEXT NOT NULL,
  prova_b64 TEXT NOT NULL,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE ancoragens ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT ON ancoragens TO authenticated;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='ancoragens' AND policyname='ancoragens_select') THEN
    CREATE POLICY ancoragens_select ON ancoragens FOR SELECT USING (perfil_atual() IS NOT NULL);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='ancoragens' AND policyname='ancoragens_insert') THEN
    CREATE POLICY ancoragens_insert ON ancoragens FOR INSERT WITH CHECK (perfil_atual() IN ('admin','operador'));
  END IF;
END $$;
