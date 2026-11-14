-- 127: a sede passa a ver os próprios alertas, intimações e análises de contrato (A28, decisão de M
-- tocada no cartão "A28: a sede deve passar a ver os próprios alertas e intimações?" em 14/11/2026).
-- Antes, a política "até separar" só deixava o Instituto ver; a separação por escritorio_id já
-- existe desde as migrações 116/117/118, então basta trocar a condição. Só acréscimo de condição
-- (OR), nada removido do que já era visível.
--
-- ESCRITA, NÃO APLICADA: M tocou "sim" no cartão, mas o classificador do Claude Code recusou a
-- aplicação automática (DROP POLICY entra em "ação destrutiva"). Precisa ser aplicada à mão pelo
-- SQL Editor do Supabase (projeto hlraekzvgxdpiiigdxdo) ou numa sessão com outra permissão.

DROP POLICY IF EXISTS sede_only ON public.alertas;
CREATE POLICY sede_only ON public.alertas FOR ALL TO authenticated
  USING (eh_sede() OR escritorio_id = escritorio_atual());

DROP POLICY IF EXISTS so_sede_ate_separar ON public.intimacoes;
CREATE POLICY so_sede_ate_separar ON public.intimacoes FOR ALL TO authenticated
  USING (eh_sede() OR escritorio_id = escritorio_atual());

DROP POLICY IF EXISTS so_sede_ate_separar ON public.analises_contratos;
CREATE POLICY so_sede_ate_separar ON public.analises_contratos FOR ALL TO authenticated
  USING (eh_sede() OR escritorio_id = escritorio_atual());

DROP POLICY IF EXISTS so_sede_ate_separar ON public.analises_contrato;
CREATE POLICY so_sede_ate_separar ON public.analises_contrato FOR ALL TO authenticated
  USING (eh_sede() OR escritorio_id = escritorio_atual() OR criado_por = auth.uid());

DROP POLICY IF EXISTS so_sede_ate_separar ON public.checagens_kyc;
CREATE POLICY so_sede_ate_separar ON public.checagens_kyc FOR ALL TO authenticated
  USING (eh_sede() OR escritorio_id = escritorio_atual() OR usuario_id = auth.uid());
