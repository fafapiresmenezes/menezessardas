-- 119: separação por escritório — lote 1 (A28, plano v4).
-- Adiciona a coluna escritorio_id em 8 tabelas que são claramente de cada escritório
-- (nada "da casa inteira"). Backfill: tudo que já existe fica na casa principal (sede).
-- Só acréscimos: nada apagado, nada renomeado. Políticas RLS antigas continuam valendo
-- até a 120 trocar "só a sede" por "só o próprio escritório"; esta 119 só prepara a coluna.

-- Se a sede foi renomeada, pega o id dela; senão usa o uuid fixo.
DO $$
DECLARE c_sede uuid := '00000000-0000-0000-0000-000000000001';
BEGIN
  -- alertas: de quem está no escritório.
  ALTER TABLE public.alertas ADD COLUMN IF NOT EXISTS escritorio_id uuid REFERENCES public.escritorios(id);
  UPDATE public.alertas SET escritorio_id = c_sede WHERE escritorio_id IS NULL;

  ALTER TABLE public.alertas_tratados ADD COLUMN IF NOT EXISTS escritorio_id uuid REFERENCES public.escritorios(id);
  UPDATE public.alertas_tratados SET escritorio_id = c_sede WHERE escritorio_id IS NULL;

  -- Análises de contrato (duas grafias herdadas).
  ALTER TABLE public.analises_contrato ADD COLUMN IF NOT EXISTS escritorio_id uuid REFERENCES public.escritorios(id);
  UPDATE public.analises_contrato SET escritorio_id = c_sede WHERE escritorio_id IS NULL;

  ALTER TABLE public.analises_contratos ADD COLUMN IF NOT EXISTS escritorio_id uuid REFERENCES public.escritorios(id);
  UPDATE public.analises_contratos SET escritorio_id = c_sede WHERE escritorio_id IS NULL;

  -- Pesquisas guardadas e checagens KYC: trabalho feito pelo escritório.
  ALTER TABLE public.buscas_salvas ADD COLUMN IF NOT EXISTS escritorio_id uuid REFERENCES public.escritorios(id);
  UPDATE public.buscas_salvas SET escritorio_id = c_sede WHERE escritorio_id IS NULL;

  ALTER TABLE public.checagens_kyc ADD COLUMN IF NOT EXISTS escritorio_id uuid REFERENCES public.escritorios(id);
  UPDATE public.checagens_kyc SET escritorio_id = c_sede WHERE escritorio_id IS NULL;

  -- Consultas ao assistente jurídico: cada escritório vê as suas.
  ALTER TABLE public.consultas_juridicas ADD COLUMN IF NOT EXISTS escritorio_id uuid REFERENCES public.escritorios(id);
  UPDATE public.consultas_juridicas SET escritorio_id = c_sede WHERE escritorio_id IS NULL;

  -- Intimações recebidas: por escritório.
  ALTER TABLE public.intimacoes ADD COLUMN IF NOT EXISTS escritorio_id uuid REFERENCES public.escritorios(id);
  UPDATE public.intimacoes SET escritorio_id = c_sede WHERE escritorio_id IS NULL;
END $$;

-- Índices leves para as consultas que vão filtrar por escritório.
CREATE INDEX IF NOT EXISTS idx_alertas_escritorio ON public.alertas(escritorio_id);
CREATE INDEX IF NOT EXISTS idx_alertas_tratados_escritorio ON public.alertas_tratados(escritorio_id);
CREATE INDEX IF NOT EXISTS idx_analises_contrato_escritorio ON public.analises_contrato(escritorio_id);
CREATE INDEX IF NOT EXISTS idx_analises_contratos_escritorio ON public.analises_contratos(escritorio_id);
CREATE INDEX IF NOT EXISTS idx_buscas_salvas_escritorio ON public.buscas_salvas(escritorio_id);
CREATE INDEX IF NOT EXISTS idx_checagens_kyc_escritorio ON public.checagens_kyc(escritorio_id);
CREATE INDEX IF NOT EXISTS idx_consultas_juridicas_escritorio ON public.consultas_juridicas(escritorio_id);
CREATE INDEX IF NOT EXISTS idx_intimacoes_escritorio ON public.intimacoes(escritorio_id);
