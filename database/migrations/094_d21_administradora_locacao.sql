-- Passo D21 (Diamante): pacote "administradora de locação" — vistoria com fotos, lançamentos mensais por contrato,
-- taxa de administração, repasse ao proprietário e prestação de contas mensal. Idempotente.
CREATE TABLE IF NOT EXISTS public.administracao_contratos (
  contrato_id uuid PRIMARY KEY REFERENCES public.contratos(id) ON DELETE CASCADE,
  taxa_pct numeric(5,2) NOT NULL DEFAULT 10 CHECK (taxa_pct >= 0 AND taxa_pct <= 50),
  proprietario_email text,
  dia_repasse integer NOT NULL DEFAULT 10 CHECK (dia_repasse BETWEEN 1 AND 28),
  ativo boolean NOT NULL DEFAULT true,
  atualizado_em timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.lancamentos_locacao (
  id bigserial PRIMARY KEY,
  contrato_id uuid NOT NULL REFERENCES public.contratos(id) ON DELETE CASCADE,
  competencia date NOT NULL,
  tipo text NOT NULL CHECK (tipo IN ('aluguel','encargo','despesa','taxa_administracao','repasse')),
  descricao text NOT NULL,
  valor numeric(14,2) NOT NULL CHECK (valor >= 0),
  pago_em date,
  comprovante text,
  criado_por uuid DEFAULT auth.uid(),
  criado_em timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS lancamentos_locacao_idx ON public.lancamentos_locacao (contrato_id, competencia);
CREATE TABLE IF NOT EXISTS public.vistorias (
  id bigserial PRIMARY KEY,
  imovel_id uuid NOT NULL REFERENCES public.imoveis(id) ON DELETE CASCADE,
  contrato_id uuid REFERENCES public.contratos(id) ON DELETE SET NULL,
  tipo text NOT NULL CHECK (tipo IN ('entrada','saida','periodica')),
  data date NOT NULL DEFAULT current_date,
  estado_geral text NOT NULL DEFAULT 'bom' CHECK (estado_geral IN ('bom','regular','ruim')),
  itens jsonb NOT NULL DEFAULT '[]'::jsonb,
  fotos jsonb NOT NULL DEFAULT '[]'::jsonb,
  observacoes text,
  responsavel text,
  criado_por uuid DEFAULT auth.uid(),
  criado_em timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS vistorias_imovel_idx ON public.vistorias (imovel_id, data DESC);
ALTER TABLE public.administracao_contratos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lancamentos_locacao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vistorias ENABLE ROW LEVEL SECURITY;
DO $p$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['administracao_contratos','lancamentos_locacao','vistorias'] LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename=t AND policyname=t||'_tudo') THEN
      EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true)', t||'_tudo', t);
    END IF;
  END LOOP;
END $p$;
