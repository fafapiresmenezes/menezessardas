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
