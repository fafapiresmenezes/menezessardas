-- 120: separação por escritório — lote 2 (A28, plano v4).
-- Coluna escritorio_id em mais 8 tabelas do dia a dia do escritório que ainda não tinham.
-- Backfill para a casa principal, só acréscimos.
DO $$
DECLARE c_sede uuid := '00000000-0000-0000-0000-000000000001';
BEGIN
  -- Financeiro dos honorários
  ALTER TABLE public.pagamentos_honorarios ADD COLUMN IF NOT EXISTS escritorio_id uuid REFERENCES public.escritorios(id);
  UPDATE public.pagamentos_honorarios SET escritorio_id = c_sede WHERE escritorio_id IS NULL;

  ALTER TABLE public.parcelas_honorarios ADD COLUMN IF NOT EXISTS escritorio_id uuid REFERENCES public.escritorios(id);
  UPDATE public.parcelas_honorarios SET escritorio_id = c_sede WHERE escritorio_id IS NULL;

  -- Notificações enviadas para os usuários
  ALTER TABLE public.notificacoes ADD COLUMN IF NOT EXISTS escritorio_id uuid REFERENCES public.escritorios(id);
  UPDATE public.notificacoes SET escritorio_id = c_sede WHERE escritorio_id IS NULL;

  -- Mensagens do portal do cliente
  ALTER TABLE public.mensagens_portal ADD COLUMN IF NOT EXISTS escritorio_id uuid REFERENCES public.escritorios(id);
  UPDATE public.mensagens_portal SET escritorio_id = c_sede WHERE escritorio_id IS NULL;

  -- Documentos do portal do cliente
  ALTER TABLE public.documentos_portal ADD COLUMN IF NOT EXISTS escritorio_id uuid REFERENCES public.escritorios(id);
  UPDATE public.documentos_portal SET escritorio_id = c_sede WHERE escritorio_id IS NULL;

  -- Administração de contratos
  ALTER TABLE public.administracao_contratos ADD COLUMN IF NOT EXISTS escritorio_id uuid REFERENCES public.escritorios(id);
  UPDATE public.administracao_contratos SET escritorio_id = c_sede WHERE escritorio_id IS NULL;

  -- Lançamentos de locação (financeiro imobiliário)
  ALTER TABLE public.lancamentos_locacao ADD COLUMN IF NOT EXISTS escritorio_id uuid REFERENCES public.escritorios(id);
  UPDATE public.lancamentos_locacao SET escritorio_id = c_sede WHERE escritorio_id IS NULL;

  -- Envios de agenda (.ics) por e-mail
  ALTER TABLE public.envios_ics ADD COLUMN IF NOT EXISTS escritorio_id uuid REFERENCES public.escritorios(id);
  UPDATE public.envios_ics SET escritorio_id = c_sede WHERE escritorio_id IS NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_pagamentos_honorarios_escritorio ON public.pagamentos_honorarios(escritorio_id);
CREATE INDEX IF NOT EXISTS idx_parcelas_honorarios_escritorio ON public.parcelas_honorarios(escritorio_id);
CREATE INDEX IF NOT EXISTS idx_notificacoes_escritorio ON public.notificacoes(escritorio_id);
CREATE INDEX IF NOT EXISTS idx_mensagens_portal_escritorio ON public.mensagens_portal(escritorio_id);
CREATE INDEX IF NOT EXISTS idx_documentos_portal_escritorio ON public.documentos_portal(escritorio_id);
CREATE INDEX IF NOT EXISTS idx_administracao_contratos_escritorio ON public.administracao_contratos(escritorio_id);
CREATE INDEX IF NOT EXISTS idx_lancamentos_locacao_escritorio ON public.lancamentos_locacao(escritorio_id);
CREATE INDEX IF NOT EXISTS idx_envios_ics_escritorio ON public.envios_ics(escritorio_id);
