-- 002 — Correções da auditoria de 24/10/2026 (seção 6) e vocabulário completo do nicho (S2).
-- Aplicar depois de schema.sql. Idempotente onde o Postgres permite.

-- ------------------------------------------------------------------
-- 1. Vocabulário completo (tipos, usos, contratos, garantias, índices)
-- ------------------------------------------------------------------
ALTER TYPE imovel_tipo ADD VALUE IF NOT EXISTS 'apartamento';
ALTER TYPE imovel_tipo ADD VALUE IF NOT EXISTS 'casa';
ALTER TYPE imovel_tipo ADD VALUE IF NOT EXISTS 'loja';
ALTER TYPE imovel_tipo ADD VALUE IF NOT EXISTS 'sala_comercial';
ALTER TYPE imovel_tipo ADD VALUE IF NOT EXISTS 'conjunto_comercial';
ALTER TYPE imovel_tipo ADD VALUE IF NOT EXISTS 'edificio';
ALTER TYPE imovel_tipo ADD VALUE IF NOT EXISTS 'galpao';

ALTER TYPE imovel_uso ADD VALUE IF NOT EXISTS 'uso_proprio';
ALTER TYPE imovel_uso ADD VALUE IF NOT EXISTS 'comodato';
ALTER TYPE imovel_uso ADD VALUE IF NOT EXISTS 'em_desenvolvimento';
ALTER TYPE imovel_uso ADD VALUE IF NOT EXISTS 'em_construcao_sem_contrato';

ALTER TYPE contrato_tipo ADD VALUE IF NOT EXISTS 'locacao_temporada';
ALTER TYPE contrato_tipo ADD VALUE IF NOT EXISTS 'built_to_suit';
ALTER TYPE contrato_tipo ADD VALUE IF NOT EXISTS 'arrendamento';
ALTER TYPE contrato_tipo ADD VALUE IF NOT EXISTS 'sla_fornecedor';

ALTER TYPE reajuste_indice ADD VALUE IF NOT EXISTS 'inpc';
ALTER TYPE reajuste_indice ADD VALUE IF NOT EXISTS 'sem_reajuste';

ALTER TYPE documento_tipo ADD VALUE IF NOT EXISTS 'alvara_funcionamento';
ALTER TYPE documento_tipo ADD VALUE IF NOT EXISTS 'alvara_construcao';
ALTER TYPE documento_tipo ADD VALUE IF NOT EXISTS 'seguro_incendio';
ALTER TYPE documento_tipo ADD VALUE IF NOT EXISTS 'convencao_condominio';
ALTER TYPE documento_tipo ADD VALUE IF NOT EXISTS 'certidao_negativa';
ALTER TYPE documento_tipo ADD VALUE IF NOT EXISTS 'laudo_vistoria';
ALTER TYPE documento_tipo ADD VALUE IF NOT EXISTS 'aditivo';
ALTER TYPE documento_tipo ADD VALUE IF NOT EXISTS 'procuracao';

DO $$ BEGIN
  CREATE TYPE garantia_tipo AS ENUM ('caucao', 'fiador', 'seguro_fianca', 'titulo_capitalizacao', 'sem_garantia');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE periodicidade_tipo AS ENUM ('mensal', 'trimestral', 'semestral', 'anual', 'unica');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE imoveis
  ADD COLUMN IF NOT EXISTS cidade TEXT,
  ADD COLUMN IF NOT EXISTS uf CHAR(2),
  ADD COLUMN IF NOT EXISTS area_m2 NUMERIC(10,2);

ALTER TABLE contratos
  ADD COLUMN IF NOT EXISTS garantia garantia_tipo DEFAULT 'sem_garantia',
  ADD COLUMN IF NOT EXISTS periodicidade periodicidade_tipo DEFAULT 'mensal',
  ALTER COLUMN data_vencimento DROP NOT NULL;  -- comodato por prazo indeterminado

-- Documento pode pertencer ao imóvel ou a um contrato específico.
ALTER TABLE documentos
  ADD COLUMN IF NOT EXISTS contrato_id UUID REFERENCES contratos(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_documentos_contrato ON documentos(contrato_id);

-- ------------------------------------------------------------------
-- 2. "Dias restantes" nunca é gravado: é calculado na consulta.
-- ------------------------------------------------------------------
ALTER TABLE alertas DROP COLUMN IF EXISTS dias_restantes;

CREATE OR REPLACE VIEW alertas_com_prazo AS
SELECT a.*, (a.data_evento - CURRENT_DATE) AS dias_restantes
FROM alertas a;

-- Status do contrato também é derivado da data, não um campo que envelhece.
CREATE OR REPLACE VIEW contratos_com_status AS
SELECT c.*,
  CASE
    WHEN c.data_vencimento IS NULL THEN 'ativo'
    WHEN c.data_vencimento < CURRENT_DATE THEN 'vencido'
    WHEN c.data_vencimento <= CURRENT_DATE + 60 THEN 'a_renovar'
    ELSE 'ativo'
  END AS status_calculado
FROM contratos c;

-- ------------------------------------------------------------------
-- 3. Gatilho sem alerta duplicado: um alerta de vencimento por contrato.
-- ------------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS uq_alerta_vencimento_por_contrato
  ON alertas (contrato_id, tipo_alerta);

CREATE OR REPLACE FUNCTION calcular_dias_restantes()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.data_vencimento IS NULL THEN
    DELETE FROM alertas WHERE contrato_id = NEW.id AND tipo_alerta = 'vencimento';
    RETURN NEW;
  END IF;
  INSERT INTO alertas (contrato_id, imovel_id, tipo_alerta, data_evento)
  VALUES (NEW.id, NEW.imovel_id, 'vencimento', NEW.data_vencimento)
  ON CONFLICT (contrato_id, tipo_alerta)
  DO UPDATE SET data_evento = EXCLUDED.data_evento, lido = false, data_leitura = NULL;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ------------------------------------------------------------------
-- 4. Segurança por linha completa. Regra: todo usuário com perfil lê;
--    admin e operador escrevem; só admin apaga.
-- ------------------------------------------------------------------
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON imoveis, contratos, documentos, alertas, analises_contratos, blockchain_registros TO authenticated;
GRANT SELECT, UPDATE ON usuarios_perfis TO authenticated;
GRANT SELECT ON alertas_com_prazo, contratos_com_status TO authenticated;

CREATE OR REPLACE FUNCTION perfil_atual() RETURNS usuario_funcao AS $$
  SELECT funcao FROM usuarios_perfis WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

ALTER TABLE analises_contratos ENABLE ROW LEVEL SECURITY;
ALTER TABLE blockchain_registros ENABLE ROW LEVEL SECURITY;

-- Limpa as políticas antigas e incompletas de imoveis.
DROP POLICY IF EXISTS admin_access ON imoveis;
DROP POLICY IF EXISTS operador_access ON imoveis;
DROP POLICY IF EXISTS leitor_access ON imoveis;

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['imoveis','contratos','documentos','alertas','analises_contratos','blockchain_registros'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I_select ON %I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS %I_insert ON %I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS %I_update ON %I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS %I_delete ON %I', t, t);
    EXECUTE format('CREATE POLICY %I_select ON %I FOR SELECT USING (perfil_atual() IS NOT NULL)', t, t);
    EXECUTE format('CREATE POLICY %I_insert ON %I FOR INSERT WITH CHECK (perfil_atual() IN (''admin'',''operador''))', t, t);
    EXECUTE format('CREATE POLICY %I_update ON %I FOR UPDATE USING (perfil_atual() IN (''admin'',''operador''))', t, t);
    EXECUTE format('CREATE POLICY %I_delete ON %I FOR DELETE USING (perfil_atual() = ''admin'')', t, t);
  END LOOP;
END $$;

-- Perfil: cada um vê o próprio; admin vê todos.
DROP POLICY IF EXISTS perfis_select ON usuarios_perfis;
CREATE POLICY perfis_select ON usuarios_perfis FOR SELECT USING (id = auth.uid() OR perfil_atual() = 'admin');
DROP POLICY IF EXISTS perfis_update ON usuarios_perfis;
CREATE POLICY perfis_update ON usuarios_perfis FOR UPDATE USING (id = auth.uid() OR perfil_atual() = 'admin');

-- ------------------------------------------------------------------
-- 5. LGPD: trilha de quem viu ou alterou dados de locatários.
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS trilha_acesso (
  id BIGSERIAL PRIMARY KEY,
  usuario_id UUID,
  tabela TEXT NOT NULL,
  registro_id UUID,
  acao TEXT NOT NULL,          -- INSERT | UPDATE | DELETE
  dados_antes JSONB,
  dados_depois JSONB,
  ocorrido_em TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE trilha_acesso ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS trilha_select ON trilha_acesso;
CREATE POLICY trilha_select ON trilha_acesso FOR SELECT USING (perfil_atual() = 'admin');
GRANT SELECT ON trilha_acesso TO authenticated;

CREATE OR REPLACE FUNCTION registrar_trilha() RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO trilha_acesso (usuario_id, tabela, registro_id, acao, dados_antes, dados_depois)
  VALUES (auth.uid(), TG_TABLE_NAME, COALESCE(NEW.id, OLD.id), TG_OP,
          CASE WHEN TG_OP IN ('UPDATE','DELETE') THEN to_jsonb(OLD) END,
          CASE WHEN TG_OP IN ('INSERT','UPDATE') THEN to_jsonb(NEW) END);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trilha_contratos ON contratos;
CREATE TRIGGER trilha_contratos AFTER INSERT OR UPDATE OR DELETE ON contratos
  FOR EACH ROW EXECUTE FUNCTION registrar_trilha();
DROP TRIGGER IF EXISTS trilha_documentos ON documentos;
CREATE TRIGGER trilha_documentos AFTER INSERT OR UPDATE OR DELETE ON documentos
  FOR EACH ROW EXECUTE FUNCTION registrar_trilha();

-- ------------------------------------------------------------------
-- 6. Armazenamento de arquivos (bucket privado "documentos").
-- ------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public) VALUES ('documentos', 'documentos', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS documentos_storage_select ON storage.objects;
CREATE POLICY documentos_storage_select ON storage.objects FOR SELECT
  USING (bucket_id = 'documentos' AND perfil_atual() IS NOT NULL);
DROP POLICY IF EXISTS documentos_storage_insert ON storage.objects;
CREATE POLICY documentos_storage_insert ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'documentos' AND perfil_atual() IN ('admin','operador'));
DROP POLICY IF EXISTS documentos_storage_delete ON storage.objects;
CREATE POLICY documentos_storage_delete ON storage.objects FOR DELETE
  USING (bucket_id = 'documentos' AND perfil_atual() = 'admin');
