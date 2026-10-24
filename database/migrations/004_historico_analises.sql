-- 004 — Histórico das análises do agente (S4). Aplicar após 002.
-- O agente guarda o resultado estruturado e o modelo usado; imovel_id passa a
-- ser opcional, pois a função no servidor recebe só o id do contrato.

ALTER TABLE analises_contratos
  ALTER COLUMN imovel_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS modelo TEXT;

-- Preenche imovel_id a partir do contrato quando vier nulo.
CREATE OR REPLACE FUNCTION preencher_imovel_analise()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.imovel_id IS NULL THEN
    SELECT imovel_id INTO NEW.imovel_id FROM contratos WHERE id = NEW.contrato_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tg_preencher_imovel_analise ON analises_contratos;
CREATE TRIGGER tg_preencher_imovel_analise BEFORE INSERT ON analises_contratos
  FOR EACH ROW EXECUTE FUNCTION preencher_imovel_analise();
