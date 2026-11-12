-- 116 — Trancas entre escritórios (pedido do M em 12/11/2026: "senão já entra direto ali").
--
-- O que estava errado, medido com uma conta administradora de OUTRO escritório (12/11/2026):
--   * ela lia as 38 linhas de `configuracoes`, inclusive anthropic_api_key, brevo_api_key e cron_segredo;
--   * ela lia consumo, trilha de auditoria, ações do consultor, resumos, checagens de contraparte e mais
--     14 tabelas da sede;
--   * definir_configuracao/remover_configuracao aceitavam administrador de qualquer escritório
--     (dava para trocar o remetente e os destinatários das peças automáticas da sede);
--   * qualquer pessoa podia mudar a PRÓPRIA função para administrador com um UPDATE em usuarios_perfis.
-- Desde a migração 111 toda conta nova é administradora do próprio escritório, então isso valia para
-- qualquer pessoa que se cadastrasse.
--
-- O que esta migração faz (nada muda para quem é da sede):
--   1. `configuracoes`: só a administração da sede lê e grava;
--   2. funções de configuração, automação, agenda e 2FA: só a sede (ou o próprio escritório, no 2FA);
--   3. `usuarios_perfis`: ninguém altera perfil direto pela API; só pelas funções (definir_funcao etc.);
--   4. tabelas que ainda não têm coluna de escritório: tranca "só a sede" (política RESTRITIVA), com
--      exceção para a linha da própria pessoa onde existe dono. Separar cada uma por escritório é o
--      passo seguinte do plano; até lá, escritório de fora vê essas telas vazias em vez de ver a sede.
-- Para voltar atrás: DROP das políticas `so_sede_ate_separar` e recriar as políticas antigas (migração 012/014).

-- 1. configuracoes -----------------------------------------------------------------------------
DROP POLICY IF EXISTS admin_ler_configuracoes ON public.configuracoes;
DROP POLICY IF EXISTS admin_inserir_configuracoes ON public.configuracoes;
DROP POLICY IF EXISTS admin_editar_configuracoes ON public.configuracoes;
DROP POLICY IF EXISTS admin_deletar_configuracoes ON public.configuracoes;
CREATE POLICY admin_ler_configuracoes ON public.configuracoes FOR SELECT TO authenticated
  USING (public.perfil_atual() = 'admin'::usuario_funcao AND public.eh_sede());
CREATE POLICY admin_inserir_configuracoes ON public.configuracoes FOR INSERT TO authenticated
  WITH CHECK (public.perfil_atual() = 'admin'::usuario_funcao AND public.eh_sede());
CREATE POLICY admin_editar_configuracoes ON public.configuracoes FOR UPDATE TO authenticated
  USING (public.perfil_atual() = 'admin'::usuario_funcao AND public.eh_sede())
  WITH CHECK (public.perfil_atual() = 'admin'::usuario_funcao AND public.eh_sede());
CREATE POLICY admin_deletar_configuracoes ON public.configuracoes FOR DELETE TO authenticated
  USING (public.perfil_atual() = 'admin'::usuario_funcao AND public.eh_sede());
REVOKE ALL ON public.configuracoes FROM anon;
REVOKE TRUNCATE, REFERENCES, TRIGGER ON public.configuracoes FROM authenticated;

-- 2. funções ------------------------------------------------------------------------------------
-- definir_configuracao: o corpo antigo (com as validações de cada chave) vira função interna;
-- a função pública só deixa a sede passar.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE pronamespace = 'public'::regnamespace AND proname = 'definir_configuracao_da_sede') THEN
    ALTER FUNCTION public.definir_configuracao(text, text) RENAME TO definir_configuracao_da_sede;
  END IF;
END $$;
REVOKE EXECUTE ON FUNCTION public.definir_configuracao_da_sede(text, text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.definir_configuracao(p_chave text, p_valor text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Faça login para alterar configurações.'; END IF;
  IF NOT public.eh_sede() THEN
    RAISE EXCEPTION 'Esta configuração ainda é só da sede da plataforma. Fale com o suporte para ligar no seu escritório.';
  END IF;
  PERFORM public.definir_configuracao_da_sede(p_chave, p_valor);
END $$;
REVOKE EXECUTE ON FUNCTION public.definir_configuracao(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.definir_configuracao(text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.remover_configuracao(p_chave text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Faça login para alterar configurações.';
  END IF;
  IF public.perfil_atual() IS DISTINCT FROM 'admin'::usuario_funcao OR NOT public.eh_sede() THEN
    RAISE EXCEPTION 'Apenas administradores da sede podem alterar configurações.';
  END IF;
  UPDATE public.configuracoes
    SET valor = '', atualizado_em = now(), atualizado_por = auth.uid()
    WHERE chave = p_chave;
END $$;

CREATE OR REPLACE FUNCTION public.estado_configuracao(p_chave text)
RETURNS TABLE(permitido boolean, definida boolean, atualizado_em timestamptz, sufixo text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR public.perfil_atual() IS DISTINCT FROM 'admin'::usuario_funcao OR NOT public.eh_sede() THEN
    RETURN QUERY SELECT false, false, NULL::TIMESTAMPTZ, NULL::TEXT;
    RETURN;
  END IF;
  RETURN QUERY
    SELECT true,
           (c.chave IS NOT NULL AND c.valor <> ''),
           c.atualizado_em,
           NULLIF(right(c.valor, 4), '')
    FROM (SELECT 1) AS um
    LEFT JOIN public.configuracoes c ON c.chave = p_chave;
END $$;

CREATE OR REPLACE FUNCTION public.emails_avisos()
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
begin
  if auth.uid() is null or public.perfil_atual() is distinct from 'admin'::usuario_funcao or not public.eh_sede() then return null; end if;
  return coalesce((select valor from configuracoes where chave = 'email_avisos_extra'), '');
end $$;

CREATE OR REPLACE FUNCTION public.ler_automacao()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  select case when auth.uid() is null or public.perfil_atual() is null or not public.eh_sede() then null else jsonb_build_object(
    'advogados', (select valor from configuracoes where chave = 'advogados_monitorados'),
    'oabs', (select valor from configuracoes where chave = 'oabs_monitoradas'),
    'destinatarios', (select valor from configuracoes where chave = 'pecas_destinatarios'),
    'ultima', (select valor from configuracoes where chave = 'prazos_ultima_execucao'),
    'email_ok', exists (select 1 from configuracoes where chave = 'brevo_api_key') and exists (select 1 from configuracoes where chave = 'email_remetente'),
    'ia_ok', exists (select 1 from configuracoes where chave = 'anthropic_api_key')
  ) end
$$;

CREATE OR REPLACE FUNCTION public.link_agenda()
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
begin
  if auth.uid() is null or public.perfil_atual() is null then raise exception 'Faça login para ver o link da agenda.'; end if;
  if not public.eh_sede() then raise exception 'A agenda no celular ainda não está ligada para o seu escritório.'; end if;
  return (select valor from public.configuracoes where chave = 'agenda_token');
end $$;

CREATE OR REPLACE FUNCTION public.admins_dois_fatores()
RETURNS TABLE(id uuid, email text, nome text, ativado boolean, ativado_em timestamptz, avisado_em timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT u.id, u.email::text, COALESCE(p.nome_completo, u.raw_user_meta_data->>'nome', u.email::text),
         EXISTS (SELECT 1 FROM auth.mfa_factors f WHERE f.user_id = u.id AND f.factor_type = 'totp' AND f.status = 'verified'),
         (SELECT min(f.created_at) FROM auth.mfa_factors f WHERE f.user_id = u.id AND f.factor_type = 'totp' AND f.status = 'verified'),
         a.enviado_em
  FROM auth.users u
  JOIN public.usuarios_perfis p ON p.id = u.id AND p.funcao = 'admin'::usuario_funcao
  LEFT JOIN public.avisos_dois_fatores a ON a.usuario_id = u.id
  WHERE auth.role() = 'service_role'
     OR (public.perfil_atual() = 'admin'::usuario_funcao AND (public.eh_sede() OR p.escritorio_id = public.escritorio_atual()))
  ORDER BY 4, 3;
$$;

-- 3. usuarios_perfis: mudança de função só por definir_funcao (que confere quem pede) ------------
DROP POLICY IF EXISTS perfis_update ON public.usuarios_perfis;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.usuarios_perfis FROM anon, authenticated;
REVOKE SELECT ON public.usuarios_perfis FROM anon;

-- 4. tabelas ainda sem coluna de escritório -----------------------------------------------------
DO $$
DECLARE
  t text;
  r record;
BEGIN
  -- 4a. só a sede, para tudo
  FOREACH t IN ARRAY ARRAY[
    'acoes_consultor', 'envios_ics', 'fotografia_carteira', 'saude_sistema', 'metas_horas', 'analises_contratos',
    'legislacao_acompanhamento', 'administracao_contratos', 'documentos_portal', 'lancamentos_locacao',
    'mensagens_portal', 'pagamentos_honorarios', 'parcelas_honorarios', 'vistorias', 'avisos_teto_ia',
    'imoveis_geo', 'intimacoes', 'relatorios_cliente_assinaturas', 'relatorios_cliente_envios', 'prestacoes_enviadas'
  ] LOOP
    IF to_regclass('public.' || quote_ident(t)) IS NOT NULL THEN
      EXECUTE format('DROP POLICY IF EXISTS so_sede_ate_separar ON public.%I', t);
      EXECUTE format('CREATE POLICY so_sede_ate_separar ON public.%I AS RESTRICTIVE FOR ALL TO authenticated USING (public.eh_sede()) WITH CHECK (public.eh_sede())', t);
    END IF;
  END LOOP;

  -- 4b. só a sede LÊ (os outros escritórios continuam gravando o próprio registro)
  FOREACH t IN ARRAY ARRAY['trilha_auditoria', 'ancoragens', 'blockchain_registros'] LOOP
    IF to_regclass('public.' || quote_ident(t)) IS NOT NULL THEN
      EXECUTE format('DROP POLICY IF EXISTS so_sede_ate_separar ON public.%I', t);
      EXECUTE format('CREATE POLICY so_sede_ate_separar ON public.%I AS RESTRICTIVE FOR SELECT TO authenticated USING (public.eh_sede())', t);
    END IF;
  END LOOP;

  -- 4c. a sede, ou a linha da própria pessoa
  FOR r IN SELECT * FROM (VALUES
    ('consumo_api', 'usuario_id'), ('checagens_kyc', 'usuario_id'), ('monitoramentos', 'criado_por'),
    ('avaliacoes_assistente', 'usuario_id'), ('revisoes_okr', 'criado_por'), ('analises_contrato', 'criado_por'),
    ('metas_horas_pessoa', 'usuario_id'), ('trilha_acesso', 'usuario_id')
  ) AS v(tabela, dono) LOOP
    IF to_regclass('public.' || quote_ident(r.tabela)) IS NOT NULL THEN
      EXECUTE format('DROP POLICY IF EXISTS so_sede_ate_separar ON public.%I', r.tabela);
      EXECUTE format('CREATE POLICY so_sede_ate_separar ON public.%I AS RESTRICTIVE FOR ALL TO authenticated USING (public.eh_sede() OR %I = auth.uid()) WITH CHECK (public.eh_sede() OR %I = auth.uid())', r.tabela, r.dono, r.dono);
    END IF;
  END LOOP;

  -- 4d. tabelas que já têm escritorio_id: cada escritório vê o seu
  FOREACH t IN ARRAY ARRAY['resumos_semanais', 'relatorios_mensais'] LOOP
    IF to_regclass('public.' || quote_ident(t)) IS NOT NULL THEN
      EXECUTE format('DROP POLICY IF EXISTS so_sede_ate_separar ON public.%I', t);
      EXECUTE format('CREATE POLICY so_sede_ate_separar ON public.%I AS RESTRICTIVE FOR ALL TO authenticated USING (public.eh_sede() OR escritorio_id = public.escritorio_atual()) WITH CHECK (public.eh_sede() OR escritorio_id = public.escritorio_atual())', t);
    END IF;
  END LOOP;
END $$;

-- 4e. aceites de termos: a própria pessoa, a sede, ou a administração do mesmo escritório
DROP POLICY IF EXISTS so_sede_ate_separar ON public.aceites_termos;
CREATE POLICY so_sede_ate_separar ON public.aceites_termos AS RESTRICTIVE FOR SELECT TO authenticated
  USING (
    public.eh_sede() OR usuario_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.usuarios_perfis p WHERE p.id = aceites_termos.usuario_id AND p.escritorio_id = public.escritorio_atual())
  );
