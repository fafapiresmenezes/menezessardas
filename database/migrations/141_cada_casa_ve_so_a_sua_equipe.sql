-- 141 · Cada casa vê só a sua própria equipe (pedido de M, 15 e 18/11/2026).
--
-- O QUE ESTAVA ERRADO: `listar_usuarios_v2`, `definir_funcao` e `admins_dois_fatores` abriam para a
-- casa principal (`eh_sede()`) a lista de TODAS as casas. A casa principal guarda o escritório Sardas
-- e Menezes, então a Hierarquia e a Área do administrador do Sardas e Menezes mostravam Marcelo
-- Alexandrino e Antonio Costa, que são do Instituto (casa THEYE Jurídico) e não têm nada a ver com o
-- escritório ("é vedado", M em 15/11/2026).
--
-- O QUE ESTA MIGRAÇÃO FAZ: cada administração lista, muda a função e confere o segundo fator só de
-- quem é da própria casa (ou pediu para entrar nela). Quem administra o Instituto (lista
-- instituto_admins, migração 118) continua podendo mudar a função de qualquer pessoa, porque é ele
-- quem libera as outras casas; mas a lista que ele vê na tela é a da casa em que está.
--
-- Desfazer: reaplicar as três funções da migração 117 (listar_usuarios_v2, definir_funcao) e 116
-- (admins_dois_fatores).

CREATE OR REPLACE FUNCTION public.listar_usuarios_v2()
RETURNS TABLE(id uuid, email text, nome_completo text, funcao usuario_funcao, criado_em timestamptz, confirmado boolean, ultimo_acesso timestamptz, escritorio_id uuid)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  select u.id, u.email::text, coalesce(p.nome_completo, u.raw_user_meta_data->>'nome'), p.funcao, u.created_at, (u.email_confirmed_at is not null), u.last_sign_in_at, p.escritorio_id
  from auth.users u left join public.usuarios_perfis p on p.id = u.id
  where public.perfil_atual() = 'admin'::usuario_funcao
    and (p.escritorio_id = public.escritorio_atual()
         or exists (select 1 from public.pedidos_entrada pe where pe.usuario_id = u.id and pe.decidido_em is null and pe.escritorio_id = public.escritorio_atual()))
  order by u.created_at;
$$;

CREATE OR REPLACE FUNCTION public.definir_funcao(p_id uuid, p_funcao text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
declare v_email text; v_nome text; v_funcao usuario_funcao; v_esc uuid; v_pedido uuid; v_destino uuid;
begin
  if auth.uid() is null then raise exception 'Faça login para alterar acessos.'; end if;
  if public.perfil_atual() is distinct from 'admin'::usuario_funcao then raise exception 'Apenas administradores podem alterar acessos.'; end if;
  if p_funcao is not null and p_funcao not in ('admin','operador','leitor') then raise exception 'Função desconhecida.'; end if;
  v_funcao := p_funcao::usuario_funcao;
  select escritorio_id into v_esc from public.usuarios_perfis where id = p_id;
  select escritorio_id into v_pedido from public.pedidos_entrada where usuario_id = p_id and decidido_em is null;
  v_destino := coalesce(v_esc, v_pedido);
  -- Só a administração do Instituto mexe em gente de outra casa; a administração de um escritório, nunca.
  if not public.eh_admin_instituto() and (v_destino is null or v_destino <> public.escritorio_atual()) then raise exception 'Esta pessoa não pertence ao seu escritório.'; end if;
  if v_esc is null and v_funcao is null then
    update public.pedidos_entrada set decidido_em = now(), decidido_por = auth.uid(), aceito = false where usuario_id = p_id and decidido_em is null;
    return;
  end if;
  if p_id = auth.uid() and v_funcao is distinct from 'admin'::usuario_funcao
     and (select count(*) from public.usuarios_perfis where funcao = 'admin'::usuario_funcao and escritorio_id = public.escritorio_atual()) <= 1 then
    raise exception 'Você é a única pessoa administradora: promova outra antes de mudar a sua função.';
  end if;
  select u.email::text, coalesce(u.raw_user_meta_data->>'nome', u.email::text) into v_email, v_nome from auth.users u where u.id = p_id;
  if v_email is null then raise exception 'Pessoa não encontrada.'; end if;
  insert into public.usuarios_perfis (id, email, nome_completo, funcao, escritorio_id)
  values (p_id, v_email, v_nome, v_funcao, coalesce(v_destino, public.escritorio_atual()))
  on conflict (id) do update set funcao = excluded.funcao;
  update public.pedidos_entrada set decidido_em = now(), decidido_por = auth.uid(), aceito = true where usuario_id = p_id and decidido_em is null;
  if v_funcao is not null then update auth.users set email_confirmed_at = coalesce(email_confirmed_at, now()) where id = p_id; end if;
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
     OR (public.perfil_atual() = 'admin'::usuario_funcao AND p.escritorio_id = public.escritorio_atual())
  ORDER BY 4, 3;
$$;

-- ---------------------------------------------------------------------------------------------------
-- Segunda revisão (18/11/2026, 22h30 UTC): o que ainda deixava a administração do escritório cliente
-- (que mora na casa principal) entrar na parte do Instituto pelo banco.
-- ---------------------------------------------------------------------------------------------------

-- 1. Sem a lista instituto_admins ninguém é Instituto (antes: todo admin da casa principal virava).
CREATE OR REPLACE FUNCTION public.eh_admin_instituto()
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_lista jsonb; v_email text;
BEGIN
  IF auth.uid() IS NULL OR NOT public.eh_sede() OR public.perfil_atual() IS DISTINCT FROM 'admin'::usuario_funcao THEN
    RETURN false;
  END IF;
  BEGIN
    SELECT c.valor::jsonb INTO v_lista FROM public.configuracoes c WHERE c.chave = 'instituto_admins';
  EXCEPTION WHEN others THEN v_lista := NULL;
  END;
  IF v_lista IS NULL OR jsonb_typeof(v_lista) <> 'array' OR jsonb_array_length(v_lista) = 0 THEN
    RETURN false;
  END IF;
  SELECT lower(u.email::text) INTO v_email FROM auth.users u WHERE u.id = auth.uid();
  RETURN EXISTS (SELECT 1 FROM jsonb_array_elements_text(v_lista) AS e(valor) WHERE lower(btrim(e.valor)) = v_email);
END $$;

-- 2. A lista de quem é Instituto e as chaves de API só podem ser lidas e mexidas pelo Instituto.
DROP POLICY IF EXISTS so_instituto_chaves_sensiveis ON public.configuracoes;
CREATE POLICY so_instituto_chaves_sensiveis ON public.configuracoes AS RESTRICTIVE FOR ALL TO authenticated
  USING (NOT (chave = 'instituto_admins' OR chave ILIKE '%api_key%' OR chave ILIKE '%token%' OR chave ILIKE '%senha%' OR chave ILIKE '%secret%') OR public.eh_admin_instituto())
  WITH CHECK (NOT (chave = 'instituto_admins' OR chave ILIKE '%api_key%' OR chave ILIKE '%token%' OR chave ILIKE '%senha%' OR chave ILIKE '%secret%') OR public.eh_admin_instituto());

-- 3. Cobrança dos escritórios parceiros, faturas, domínio e painel por escritório: só o Instituto.
CREATE OR REPLACE FUNCTION public.cobranca_escritorios()
RETURNS TABLE(id uuid, nome text, plano text, criado_em timestamptz, operadores bigint, leitores bigint, mensal numeric, mensal_1ano numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  select e.id, e.nome, e.plano, e.criado_em,
    count(p.id) filter (where p.funcao in ('admin','operador')) as operadores,
    count(p.id) filter (where p.funcao = 'leitor') as leitores,
    390 * count(p.id) filter (where p.funcao in ('admin','operador')) + 120 * count(p.id) filter (where p.funcao = 'leitor') as mensal,
    round((390 * count(p.id) filter (where p.funcao in ('admin','operador')) + 120 * count(p.id) filter (where p.funcao = 'leitor')) * 0.7, 2) as mensal_1ano
  from public.escritorios e left join public.usuarios_perfis p on p.escritorio_id = e.id
  where public.eh_admin_instituto()
  group by e.id order by e.criado_em;
$$;

CREATE OR REPLACE FUNCTION public.gerar_faturas_escritorios(p_competencia date DEFAULT (date_trunc('month', CURRENT_DATE::timestamptz))::date)
RETURNS SETOF public.faturas_escritorio LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
declare e record; v_op int; v_le int; v_cheio numeric; v_desc int; begin
  if auth.uid() is not null and not public.eh_admin_instituto() then raise exception 'Apenas a administração do Instituto gera faturas.'; end if;
  for e in select * from public.escritorios where id <> '00000000-0000-0000-0000-000000000001' loop
    select count(*) filter (where funcao in ('admin','operador')), count(*) filter (where funcao = 'leitor') into v_op, v_le from public.usuarios_perfis where escritorio_id = e.id;
    if v_op + v_le = 0 then continue; end if;
    v_cheio := 390 * v_op + 120 * v_le;
    v_desc := case when p_competencia < (e.criado_em + interval '1 year')::date then 30 else 0 end;
    insert into public.faturas_escritorio (escritorio_id, competencia, operadores, leitores, valor_cheio, desconto_pct, valor, vencimento)
      values (e.id, date_trunc('month', p_competencia)::date, v_op, v_le, v_cheio, v_desc, round(v_cheio * (100 - v_desc) / 100.0, 2), (date_trunc('month', p_competencia) + interval '9 days')::date)
      on conflict (escritorio_id, competencia) do nothing;
  end loop;
  return query select * from public.faturas_escritorio where competencia = date_trunc('month', p_competencia)::date order by criado_em;
end $$;

CREATE OR REPLACE FUNCTION public.definir_dominio(p_escritorio uuid, p_dominio text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v text := lower(trim(coalesce(p_dominio, '')));
BEGIN
  IF NOT public.eh_admin_instituto() THEN RAISE EXCEPTION 'Apenas a administração do Instituto define domínios.'; END IF;
  IF v <> '' AND v !~ '^([a-z0-9-]+\.)+[a-z]{2,}$' THEN RAISE EXCEPTION 'Domínio inválido: use algo como advocacia.com.br (sem https nem barra).'; END IF;
  IF v <> '' AND EXISTS (SELECT 1 FROM public.escritorios WHERE lower(dominio) = v AND id <> p_escritorio) THEN RAISE EXCEPTION 'Este domínio já está em uso por outro escritório.'; END IF;
  UPDATE public.escritorios SET dominio = nullif(v, '') WHERE id = p_escritorio;
END $$;

CREATE OR REPLACE FUNCTION public.painel_escritorios()
RETURNS TABLE(id uuid, nome text, pessoas bigint, imoveis bigint, contratos_ativos bigint, casos_abertos bigint, horas_mes numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  select e.id, e.nome,
    (select count(*) from public.usuarios_perfis p where p.escritorio_id = e.id),
    (select count(*) from public.imoveis i where i.escritorio_id = e.id),
    (select count(*) from public.contratos c where c.escritorio_id = e.id and c.encerrado_em is null),
    (select count(*) from public.tarefas t where t.escritorio_id = e.id and t.pai_id is null and t.tipo is not null and t.situacao <> 'feito'),
    coalesce((select round(sum(h.minutos)::numeric / 60, 1) from public.lancamentos_horas h where h.escritorio_id = e.id and h.data >= date_trunc('month', current_date)), 0)
  from public.escritorios e
  where public.eh_admin_instituto()
  order by e.criado_em
$$;

-- 4. O Instituto continua vendo as pessoas de TODAS as casas, numa função própria (painel de parceiros).
CREATE OR REPLACE FUNCTION public.listar_usuarios_todas_casas()
RETURNS TABLE(id uuid, email text, nome_completo text, funcao usuario_funcao, criado_em timestamptz, confirmado boolean, ultimo_acesso timestamptz, escritorio_id uuid)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  select u.id, u.email::text, coalesce(p.nome_completo, u.raw_user_meta_data->>'nome'), p.funcao, u.created_at, (u.email_confirmed_at is not null), u.last_sign_in_at, p.escritorio_id
  from auth.users u left join public.usuarios_perfis p on p.id = u.id
  where public.eh_admin_instituto()
  order by u.created_at;
$$;
REVOKE ALL ON FUNCTION public.listar_usuarios_todas_casas() FROM anon;
GRANT EXECUTE ON FUNCTION public.listar_usuarios_todas_casas() TO authenticated;

-- 5. definir_funcao: decide só o pedido da casa de destino, e não deixa uma casa sem administração.
CREATE OR REPLACE FUNCTION public.definir_funcao(p_id uuid, p_funcao text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
declare v_email text; v_nome text; v_funcao usuario_funcao; v_esc uuid; v_pedido uuid; v_destino uuid; v_funcao_atual usuario_funcao;
begin
  if auth.uid() is null then raise exception 'Faça login para alterar acessos.'; end if;
  if public.perfil_atual() is distinct from 'admin'::usuario_funcao then raise exception 'Apenas administradores podem alterar acessos.'; end if;
  if p_funcao is not null and p_funcao not in ('admin','operador','leitor') then raise exception 'Função desconhecida.'; end if;
  v_funcao := p_funcao::usuario_funcao;
  select escritorio_id, funcao into v_esc, v_funcao_atual from public.usuarios_perfis where id = p_id;
  select escritorio_id into v_pedido from public.pedidos_entrada where usuario_id = p_id and decidido_em is null
    order by (escritorio_id = public.escritorio_atual()) desc, criado_em limit 1;
  v_destino := coalesce(v_esc, v_pedido);
  if not public.eh_admin_instituto() and (v_destino is null or v_destino <> public.escritorio_atual()) then raise exception 'Esta pessoa não pertence ao seu escritório.'; end if;
  if v_esc is null and v_funcao is null then
    update public.pedidos_entrada set decidido_em = now(), decidido_por = auth.uid(), aceito = false where usuario_id = p_id and decidido_em is null and escritorio_id = v_destino;
    return;
  end if;
  if v_funcao_atual = 'admin'::usuario_funcao and v_funcao is distinct from 'admin'::usuario_funcao
     and (select count(*) from public.usuarios_perfis where funcao = 'admin'::usuario_funcao and escritorio_id = v_destino) <= 1 then
    raise exception 'Esta é a única pessoa administradora deste escritório: promova outra antes de mudar a função dela.';
  end if;
  select u.email::text, coalesce(u.raw_user_meta_data->>'nome', u.email::text) into v_email, v_nome from auth.users u where u.id = p_id;
  if v_email is null then raise exception 'Pessoa não encontrada.'; end if;
  insert into public.usuarios_perfis (id, email, nome_completo, funcao, escritorio_id)
  values (p_id, v_email, v_nome, v_funcao, coalesce(v_destino, public.escritorio_atual()))
  on conflict (id) do update set funcao = excluded.funcao;
  update public.pedidos_entrada set decidido_em = now(), decidido_por = auth.uid(), aceito = true where usuario_id = p_id and decidido_em is null and escritorio_id = v_destino;
  if v_funcao is not null then update auth.users set email_confirmed_at = coalesce(email_confirmed_at, now()) where id = p_id; end if;
end $$;
