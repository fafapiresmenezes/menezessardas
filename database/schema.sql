-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enum types
CREATE TYPE imovel_tipo AS ENUM ('residencial', 'comercial', 'hotel', 'garagem', 'terreno');
CREATE TYPE imovel_uso AS ENUM ('proprio', 'locado', 'vago', 'em_construcao');
CREATE TYPE contrato_tipo AS ENUM ('locacao_residencial', 'locacao_comercial', 'comodato', 'sla');
CREATE TYPE reajuste_indice AS ENUM ('ipca', 'igpm', 'fixo', 'outro');
CREATE TYPE contrato_status AS ENUM ('ativo', 'vencido', 'a_renovar');
CREATE TYPE documento_tipo AS ENUM ('matricula_rgi', 'iptu', 'habite_se', 'alvara', 'avcb', 'contrato', 'outro');
CREATE TYPE documento_status AS ENUM ('valido', 'vencido', 'a_renovar');
CREATE TYPE alerta_tipo AS ENUM ('vencimento', 'reajuste', 'avcb_vencimento', 'iptu_vencimento', 'alvara_vencimento');
CREATE TYPE usuario_funcao AS ENUM ('admin', 'operador', 'leitor');

-- Imóveis Table
CREATE TABLE imoveis (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  endereco TEXT NOT NULL,
  tipo imovel_tipo NOT NULL,
  uso_atual imovel_uso NOT NULL,
  proprietario_nome TEXT NOT NULL,
  matricula_rgi TEXT UNIQUE,
  iptu_valid BOOLEAN DEFAULT false,
  habite_se BOOLEAN DEFAULT false,
  alvara BOOLEAN DEFAULT false,
  avcb BOOLEAN DEFAULT false,
  notas TEXT,
  criado_em TIMESTAMP DEFAULT NOW(),
  atualizado_em TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_imoveis_tipo ON imoveis(tipo);
CREATE INDEX idx_imoveis_uso ON imoveis(uso_atual);
CREATE INDEX idx_imoveis_matricula ON imoveis(matricula_rgi);

-- Contratos Table
CREATE TABLE contratos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  imovel_id UUID NOT NULL REFERENCES imoveis(id) ON DELETE CASCADE,
  tipo contrato_tipo NOT NULL,
  locatario_fornecedor TEXT NOT NULL,
  data_inicio DATE NOT NULL,
  data_vencimento DATE NOT NULL,
  valor_periodico NUMERIC(12, 2),
  indice_reajuste reajuste_indice NOT NULL,
  data_ultimo_reajuste DATE,
  status contrato_status DEFAULT 'ativo',
  caminho_arquivo TEXT,
  notas TEXT,
  criado_em TIMESTAMP DEFAULT NOW(),
  atualizado_em TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_contratos_imovel ON contratos(imovel_id);
CREATE INDEX idx_contratos_vencimento ON contratos(data_vencimento);
CREATE INDEX idx_contratos_status ON contratos(status);

-- Documentos Table
CREATE TABLE documentos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  imovel_id UUID NOT NULL REFERENCES imoveis(id) ON DELETE CASCADE,
  tipo_documento documento_tipo NOT NULL,
  nome_arquivo TEXT NOT NULL,
  caminho_storage TEXT NOT NULL,
  url_publica TEXT,
  data_vencimento DATE,
  status documento_status DEFAULT 'valido',
  notas TEXT,
  criado_em TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_documentos_imovel ON documentos(imovel_id);
CREATE INDEX idx_documentos_tipo ON documentos(tipo_documento);
CREATE INDEX idx_documentos_vencimento ON documentos(data_vencimento);

-- Usuários Profiles Table
CREATE TABLE usuarios_perfis (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  nome_completo TEXT,
  funcao usuario_funcao DEFAULT 'operador',
  criado_em TIMESTAMP DEFAULT NOW()
);

-- Alertas Table
CREATE TABLE alertas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contrato_id UUID NOT NULL REFERENCES contratos(id) ON DELETE CASCADE,
  imovel_id UUID NOT NULL REFERENCES imoveis(id) ON DELETE CASCADE,
  tipo_alerta alerta_tipo NOT NULL,
  dias_restantes INTEGER,
  data_evento DATE NOT NULL,
  data_criacao TIMESTAMP DEFAULT NOW(),
  lido BOOLEAN DEFAULT false,
  data_leitura TIMESTAMP
);

CREATE INDEX idx_alertas_imovel ON alertas(imovel_id);
CREATE INDEX idx_alertas_contrato ON alertas(contrato_id);
CREATE INDEX idx_alertas_data ON alertas(data_evento);
CREATE INDEX idx_alertas_lido ON alertas(lido);

-- Análises de Contratos Table (para Claude AI)
CREATE TABLE analises_contratos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contrato_id UUID NOT NULL REFERENCES contratos(id) ON DELETE CASCADE,
  imovel_id UUID NOT NULL REFERENCES imoveis(id) ON DELETE CASCADE,
  resposta_json JSONB NOT NULL,
  criado_em TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_analises_contrato ON analises_contratos(contrato_id);
CREATE INDEX idx_analises_imovel ON analises_contratos(imovel_id);

-- Blockchain Registry (para DASH/tamper-evidence)
CREATE TABLE blockchain_registros (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  imovel_id UUID REFERENCES imoveis(id) ON DELETE SET NULL,
  pdf_hash TEXT NOT NULL UNIQUE,
  dash_tx TEXT,
  dash_confirmado BOOLEAN DEFAULT false,
  criado_em TIMESTAMP DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE imoveis ENABLE ROW LEVEL SECURITY;
ALTER TABLE contratos ENABLE ROW LEVEL SECURITY;
ALTER TABLE documentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE alertas ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios_perfis ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Admin can access everything
CREATE POLICY admin_access ON imoveis FOR ALL USING (
  EXISTS (
    SELECT 1 FROM usuarios_perfis
    WHERE usuarios_perfis.id = auth.uid()
    AND usuarios_perfis.funcao = 'admin'
  )
);

-- RLS Policy: Operador can CRUD
CREATE POLICY operador_access ON imoveis FOR ALL USING (
  EXISTS (
    SELECT 1 FROM usuarios_perfis
    WHERE usuarios_perfis.id = auth.uid()
    AND usuarios_perfis.funcao IN ('admin', 'operador')
  )
);

-- RLS Policy: Leitor can only SELECT
CREATE POLICY leitor_access ON imoveis FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM usuarios_perfis
    WHERE usuarios_perfis.id = auth.uid()
  )
);

-- Similar policies for contratos, documentos, alertas...
-- (Simplified for brevity)

-- Trigger function to auto-calculate alerts
CREATE OR REPLACE FUNCTION calcular_dias_restantes()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO alertas (contrato_id, imovel_id, tipo_alerta, dias_restantes, data_evento)
  VALUES (
    NEW.id,
    NEW.imovel_id,
    'vencimento'::alerta_tipo,
    (NEW.data_vencimento - CURRENT_DATE),
    NEW.data_vencimento
  )
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calcular_alertas
AFTER INSERT OR UPDATE ON contratos
FOR EACH ROW
EXECUTE FUNCTION calcular_dias_restantes();

-- Grant permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
