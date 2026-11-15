-- CORREÇÃO URGENTE da migração 127: ela recriou as políticas sem "AS RESTRICTIVE", então viraram
-- PERMISSIVE e passaram a somar (OR) com as políticas de SELECT já existentes em vez de restringir
-- (AND). Resultado real, em produção: qualquer pessoa logada, de qualquer escritório, passou a
-- enxergar alertas, intimações, análises de contrato e checagens de KYC de TODOS os escritórios.
-- Esta migração devolve o comportamento restritivo original, mantendo a regra nova (sede OU o
-- próprio escritório). RODAR O QUANTO ANTES.

DROP POLICY IF EXISTS sede_only ON public.alertas;
CREATE POLICY sede_only ON public.alertas AS RESTRICTIVE FOR ALL TO authenticated
  USING (eh_sede() OR escritorio_id = escritorio_atual());

DROP POLICY IF EXISTS so_sede_ate_separar ON public.intimacoes;
CREATE POLICY so_sede_ate_separar ON public.intimacoes AS RESTRICTIVE FOR ALL TO authenticated
  USING (eh_sede() OR escritorio_id = escritorio_atual());

DROP POLICY IF EXISTS so_sede_ate_separar ON public.analises_contratos;
CREATE POLICY so_sede_ate_separar ON public.analises_contratos AS RESTRICTIVE FOR ALL TO authenticated
  USING (eh_sede() OR escritorio_id = escritorio_atual());

DROP POLICY IF EXISTS so_sede_ate_separar ON public.analises_contrato;
CREATE POLICY so_sede_ate_separar ON public.analises_contrato AS RESTRICTIVE FOR ALL TO authenticated
  USING (eh_sede() OR escritorio_id = escritorio_atual() OR criado_por = auth.uid());

DROP POLICY IF EXISTS so_sede_ate_separar ON public.checagens_kyc;
CREATE POLICY so_sede_ate_separar ON public.checagens_kyc AS RESTRICTIVE FOR ALL TO authenticated
  USING (eh_sede() OR escritorio_id = escritorio_atual() OR usuario_id = auth.uid());
