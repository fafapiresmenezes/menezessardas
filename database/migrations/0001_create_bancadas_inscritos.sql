-- Create bancadas_inscritos table
CREATE TABLE IF NOT EXISTS bancadas_inscritos (
  id BIGSERIAL PRIMARY KEY,
  nome_completo TEXT NOT NULL,
  titulo_academico TEXT,
  instituicao TEXT,
  pais TEXT,
  areas_interesse TEXT[] DEFAULT '{}',
  cv_linkedin TEXT,
  email TEXT NOT NULL,
  concorda_termos BOOLEAN DEFAULT false,
  data_inscricao TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE bancadas_inscritos ENABLE ROW LEVEL SECURITY;

-- Create RLS policy to allow anyone to insert (append-only)
CREATE POLICY "bancadas_inscritos_insert"
  ON bancadas_inscritos
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Create RLS policy to prevent updates and deletes
CREATE POLICY "bancadas_inscritos_read"
  ON bancadas_inscritos
  FOR SELECT
  TO authenticated
  USING (true);

-- Create index for performance
CREATE INDEX idx_bancadas_email ON bancadas_inscritos(email);
CREATE INDEX idx_bancadas_data_inscricao ON bancadas_inscritos(data_inscricao);
