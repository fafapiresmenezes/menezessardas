-- 117 — Entrar dizendo de qual escritório você é (pedido do M em 12/11/2026).
--
-- Antes: quem criava conta ganhava um escritório próprio na hora, sem ninguém liberar, e o nome
-- do escritório digitado no cadastro era ignorado.
-- Agora:
--   * a pessoa escreve o nome do escritório (padrão da casa: LETRAS MAIÚSCULAS);
--   * se o escritório JÁ existe, nasce um "pedido de entrada": a pessoa não entra em nada até a
--     administração daquele escritório liberar (tela Área do administrador);
--   * se NÃO existe, o escritório é criado com aquele nome e a pessoa vira administradora dele;
--   * convite e e-mail @gmenezes.com / @lsm.law continuam como estavam (migrações 111 e 115).
-- Também cria leitura e gravação de configurações POR ESCRITÓRIO (cargos, preferências, metas e
-- parâmetros de escrita), para que a migração 116 não tire isso de quem não é administrador da sede.

-- 1. Nome do escritório: comparação sem acento, sem pontuação e sem diferença de maiúscula ----------
CREATE OR REPLACE FUNCTION public.normalizar_nome_escritorio(p text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT btrim(regexp_replace(
    translate(upper(coalesce(p, '')), 'ÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑ&', 'AAAAAEEEEIIIIOOOOOUUUUCNE'),
    '[^A-Z0-9]+', ' ', 'g'))
$$;

-- Outros nomes pelos quais o escritório é conhecido (já normalizados). Evita que alguém "tome" o nome.
ALTER TABLE public.escritorios ADD COLUMN IF NOT EXISTS apelidos text[] NOT NULL DEFAULT '{}';
UPDATE public.escritorios
   SET apelidos = ARRAY['SARDAS E MENEZES', 'MENEZES E SARDAS', 'SARDAS MENEZES', 'MENEZES SARDAS', 'INSTITUTO THEYE',
                        'THEYE', 'THEYE CLUB', 'THEYE INSTITUTE', 'G MENEZES', 'GMENEZES', 'G MENEZES ADVOGADOS', 'GMENEZES ADVOGADOS']
 WHERE id = '00000000-0000-0000-0000-000000000001';
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.escritorios FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.escritorio_por_nome(p_nome text)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT e.id FROM public.escritorios e
   WHERE public.normalizar_nome_escritorio(p_nome) <> ''
     AND (public.normalizar_nome_escritorio(e.nome) = public.normalizar_nome_escritorio(p_nome)
       OR public.normalizar_nome_escritorio(e.nome_exibicao) = public.normalizar_nome_escritorio(p_nome)
       OR public.normalizar_nome_escritorio(p_nome) = ANY (e.apelidos))
   ORDER BY (e.id = '00000000-0000-0000-0000-000000000001') DESC, e.criado_em
   LIMIT 1
$$;
REVOKE EXECUTE ON FUNCTION public.escritorio_por_nome(text) FROM PUBLIC, anon, authenticated;

-- 2. Pedidos de entrada ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.pedidos_entrada (
  usuario_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  nome text,
  escritorio_id uuid NOT NULL REFERENCES public.escritorios(id) ON DELETE CASCADE,
  nome_digitado text NOT NULL,
  criado_em timestamptz NOT NULL DEFAULT now(),
  decidido_em timestamptz,
  decidido_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  aceito boolean
);
CREATE INDEX IF NOT EXISTS pedidos_entrada_pendentes_idx ON public.pedidos_entrada (escritorio_id) WHERE decidido_em IS NULL;
ALTER TABLE public.pedidos_entrada ENABLE ROW LEVEL SECURITY;
-- Sem política: ninguém lê nem grava direto; só pelas funções abaixo.
REVOKE ALL ON public.pedidos_entrada FROM anon, authenticated;

-- Coração da regra: escritório que existe => pedido pendente; que não existe => cria e administra.
CREATE OR REPLACE FUNCTION public.pedir_ou_criar_escritorio(p_usuario uuid, p_email text, p_nome_pessoa text, p_escritorio text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_norm text := public.normalizar_nome_escritorio(p_escritorio);
  v_limpo text := left(btrim(regexp_replace(upper(coalesce(p_escritorio, '')), '\s+', ' ', 'g')), 120);
  v_esc uuid;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('escritorio:' || v_norm));
  v_esc := public.escritorio_por_nome(p_escritorio);
  IF v_esc IS NOT NULL THEN
    INSERT INTO public.pedidos_entrada (usuario_id, email, nome, escritorio_id, nome_digitado)
    VALUES (p_usuario, p_email, p_nome_pessoa, v_esc, v_limpo)
    ON CONFLICT (usuario_id) DO UPDATE
      SET escritorio_id = excluded.escritorio_id, nome_digitado = excluded.nome_digitado, email = excluded.email,
          nome = excluded.nome, criado_em = now(), decidido_em = NULL, decidido_por = NULL, aceito = NULL;
    RETURN 'pendente';
  END IF;
  INSERT INTO public.escritorios (nome) VALUES (v_limpo) RETURNING id INTO v_esc;
  INSERT INTO public.usuarios_perfis (id, email, nome_completo, funcao, escritorio_id)
  VALUES (p_usuario, p_email, coalesce(nullif(btrim(p_nome_pessoa), ''), p_email), 'admin', v_esc);
  DELETE FROM public.pedidos_entrada WHERE usuario_id = p_usuario;
  RETURN 'criado';
END $$;
REVOKE EXECUTE ON FUNCTION public.pedir_ou_criar_escritorio(uuid, text, text, text) FROM PUBLIC, anon, authenticated;

-- 3. Cadastro ---------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.criar_perfil_primeiro_acesso()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_nome text;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.usuarios_perfis) THEN
    INSERT INTO public.usuarios_perfis (id, email, nome_completo, funcao)
    VALUES (NEW.id, NEW.email, COALESCE(NULLIF(trim(NEW.raw_user_meta_data->>'nome'), ''), NEW.email), 'admin');
    RETURN NEW;
  END IF;
  IF NEW.email IS NULL THEN
    RETURN NEW;
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.convites_escritorio c
    WHERE lower(c.email) = lower(NEW.email) AND c.aceito_em IS NULL AND c.expira_em >= now()
  ) THEN
    RETURN NEW;
  END IF;
  IF EXISTS (SELECT 1 FROM public.usuarios_perfis p WHERE p.id = NEW.id) THEN
    RETURN NEW;
  END IF;
  IF lower(split_part(NEW.email, '@', 2)) IN ('gmenezes.com', 'lsm.law') THEN
    INSERT INTO public.usuarios_perfis (id, email, nome_completo, funcao, escritorio_id)
    VALUES (NEW.id, NEW.email, COALESCE(NULLIF(trim(NEW.raw_user_meta_data->>'nome'), ''), NEW.email),
            'operador', '00000000-0000-0000-0000-000000000001');
    RETURN NEW;
  END IF;
  v_nome := COALESCE(NULLIF(trim(NEW.raw_user_meta_data->>'nome'), ''), split_part(NEW.email, '@', 1));
  -- Nome do escritório digitado no cadastro: pedido de entrada (se existe) ou escritório novo.
  IF length(public.normalizar_nome_escritorio(NEW.raw_user_meta_data->>'escritorio')) >= 3 THEN
    -- Se algo falhar aqui, o cadastro não é barrado: a pessoa fica sem escritório e a tela pergunta de novo.
    BEGIN
      PERFORM public.pedir_ou_criar_escritorio(NEW.id, NEW.email, v_nome, NEW.raw_user_meta_data->>'escritorio');
    EXCEPTION WHEN others THEN NULL;
    END;
    RETURN NEW;
  END IF;
  -- Sem nome de escritório (cadastro antigo): fica sem perfil e a tela pergunta o escritório ao entrar.
  RETURN NEW;
END;
$function$;

-- 4. O que a pessoa sem escritório vê e faz --------------------------------------------------------
CREATE OR REPLACE FUNCTION public.meu_pedido_entrada()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_funcao usuario_funcao; v_tem boolean := false; v_email text; r public.pedidos_entrada;
BEGIN
  IF auth.uid() IS NULL THEN RETURN jsonb_build_object('estado', 'fora'); END IF;
  SELECT true, p.funcao INTO v_tem, v_funcao FROM public.usuarios_perfis p WHERE p.id = auth.uid();
  IF coalesce(v_tem, false) THEN
    RETURN jsonb_build_object('estado', CASE WHEN v_funcao IS NULL THEN 'suspenso' ELSE 'dentro' END);
  END IF;
  SELECT * INTO r FROM public.pedidos_entrada WHERE usuario_id = auth.uid();
  IF r.usuario_id IS NOT NULL AND (r.decidido_em IS NULL OR r.aceito IS NOT TRUE) THEN
    RETURN jsonb_build_object('estado', CASE WHEN r.decidido_em IS NULL THEN 'pendente' ELSE 'recusado' END,
                              'escritorio', r.nome_digitado, 'desde', r.criado_em);
  END IF;
  SELECT u.email::text INTO v_email FROM auth.users u WHERE u.id = auth.uid();
  IF EXISTS (SELECT 1 FROM public.convites_escritorio c WHERE lower(c.email) = lower(v_email) AND c.aceito_em IS NULL AND c.expira_em >= now()) THEN
    RETURN jsonb_build_object('estado', 'convite');
  END IF;
  RETURN jsonb_build_object('estado', 'nenhum');
END $$;
REVOKE EXECUTE ON FUNCTION public.meu_pedido_entrada() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.meu_pedido_entrada() TO authenticated;

CREATE OR REPLACE FUNCTION public.entrar_em_escritorio(p_nome text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_email text; v_nome text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Faça login para escolher o escritório.'; END IF;
  IF EXISTS (SELECT 1 FROM public.usuarios_perfis WHERE id = auth.uid()) THEN
    RAISE EXCEPTION 'Você já pertence a um escritório. Para mudar, fale com a pessoa administradora.';
  END IF;
  IF length(public.normalizar_nome_escritorio(p_nome)) < 3 THEN
    RAISE EXCEPTION 'Escreva o nome do escritório com pelo menos 3 letras.';
  END IF;
  SELECT u.email::text, coalesce(nullif(btrim(u.raw_user_meta_data->>'nome'), ''), split_part(u.email::text, '@', 1))
    INTO v_email, v_nome FROM auth.users u WHERE u.id = auth.uid();
  PERFORM public.pedir_ou_criar_escritorio(auth.uid(), v_email, v_nome, p_nome);
  RETURN public.meu_pedido_entrada();
END $$;
REVOKE EXECUTE ON FUNCTION public.entrar_em_escritorio(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.entrar_em_escritorio(text) TO authenticated;

-- 5. O que a administração do escritório vê e faz ---------------------------------------------------
CREATE OR REPLACE FUNCTION public.pedidos_entrada_pendentes()
RETURNS TABLE(usuario_id uuid, email text, nome text, nome_digitado text, criado_em timestamptz, escritorio_id uuid, escritorio_nome text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT pe.usuario_id, pe.email, pe.nome, pe.nome_digitado, pe.criado_em, pe.escritorio_id, e.nome
    FROM public.pedidos_entrada pe JOIN public.escritorios e ON e.id = pe.escritorio_id
   WHERE pe.decidido_em IS NULL
     AND public.perfil_atual() = 'admin'::usuario_funcao
     AND (public.eh_sede() OR pe.escritorio_id = public.escritorio_atual())
   ORDER BY pe.criado_em
$$;
REVOKE EXECUTE ON FUNCTION public.pedidos_entrada_pendentes() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pedidos_entrada_pendentes() TO authenticated;

-- A lista da equipe passa a incluir quem pediu para entrar no escritório de quem olha.
CREATE OR REPLACE FUNCTION public.listar_usuarios_v2()
RETURNS TABLE(id uuid, email text, nome_completo text, funcao usuario_funcao, criado_em timestamptz, confirmado boolean, ultimo_acesso timestamptz, escritorio_id uuid)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  select u.id, u.email::text, coalesce(p.nome_completo, u.raw_user_meta_data->>'nome'), p.funcao, u.created_at, (u.email_confirmed_at is not null), u.last_sign_in_at, p.escritorio_id
  from auth.users u left join public.usuarios_perfis p on p.id = u.id
  where public.perfil_atual() = 'admin'::usuario_funcao
    and (public.eh_sede() or p.escritorio_id = public.escritorio_atual()
         or exists (select 1 from public.pedidos_entrada pe where pe.usuario_id = u.id and pe.decidido_em is null and pe.escritorio_id = public.escritorio_atual()))
  order by u.created_at;
$$;

-- Liberar (ou recusar) quem pediu: a pessoa entra no escritório que ELA pediu, nunca em outro.
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
  if not public.eh_sede() and (v_destino is null or v_destino <> public.escritorio_atual()) then raise exception 'Esta pessoa não pertence ao seu escritório.'; end if;
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

-- 6. Configurações por escritório -------------------------------------------------------------------
-- A sede usa a chave pura (como sempre); cada outro escritório usa "esc:<id>:<chave>".
CREATE OR REPLACE FUNCTION public.config_chave_do_escritorio(p_chave text)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE WHEN public.eh_sede() THEN p_chave ELSE 'esc:' || public.escritorio_atual()::text || ':' || p_chave END
$$;
REVOKE EXECUTE ON FUNCTION public.config_chave_do_escritorio(text) FROM PUBLIC, anon, authenticated;

-- Leitura por qualquer pessoa do escritório. Só as chaves desta lista; nunca chaves de API.
CREATE OR REPLACE FUNCTION public.config_ler(p_chaves text[] DEFAULT NULL, p_prefixo text DEFAULT NULL)
RETURNS TABLE(chave text, valor text) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_pre text;
BEGIN
  IF auth.uid() IS NULL OR public.perfil_atual() IS NULL THEN RETURN; END IF;
  v_pre := public.config_chave_do_escritorio('');
  IF p_prefixo IS NOT NULL THEN
    IF p_prefixo <> 'escrita_' THEN RAISE EXCEPTION 'Prefixo não permitido.'; END IF;
    RETURN QUERY SELECT substr(c.chave, length(v_pre) + 1), c.valor FROM public.configuracoes c
                  WHERE left(c.chave, length(v_pre) + 8) = v_pre || 'escrita_';
  END IF;
  IF p_chaves IS NOT NULL THEN
    RETURN QUERY SELECT k, c.valor FROM unnest(p_chaves) AS k
                   JOIN public.configuracoes c ON c.chave = CASE WHEN k = 'wcag_ultima' THEN k ELSE v_pre || k END
                  WHERE k IN ('cargos', 'preferencias_usuarios', 'metas_okr', 'oabs_monitoradas', 'cnj_ultima_consulta', 'wcag_ultima')
                     OR left(k, 8) = 'escrita_';
  END IF;
END $$;
REVOKE EXECUTE ON FUNCTION public.config_ler(text[], text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.config_ler(text[], text) TO authenticated;

-- Gravação só pela administração do escritório: cargos, metas e parâmetros de escrita.
CREATE OR REPLACE FUNCTION public.config_gravar(p_itens jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE k text; v text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Faça login para salvar.'; END IF;
  IF public.perfil_atual() IS DISTINCT FROM 'admin'::usuario_funcao THEN RAISE EXCEPTION 'Só a administração do escritório pode salvar isto.'; END IF;
  IF jsonb_typeof(p_itens) IS DISTINCT FROM 'object' THEN RAISE EXCEPTION 'Formato inválido.'; END IF;
  FOR k, v IN SELECT * FROM jsonb_each_text(p_itens) LOOP
    IF NOT (k IN ('cargos', 'metas_okr') OR k ~ '^escrita_[a-z0-9_]{1,60}$') THEN RAISE EXCEPTION 'Configuração não permitida: %', k; END IF;
    IF length(coalesce(v, '')) > 20000 THEN RAISE EXCEPTION 'Texto grande demais em %.', k; END IF;
    INSERT INTO public.configuracoes (chave, valor, atualizado_em, atualizado_por)
    VALUES (public.config_chave_do_escritorio(k), coalesce(v, ''), now(), auth.uid())
    ON CONFLICT (chave) DO UPDATE SET valor = excluded.valor, atualizado_em = now(), atualizado_por = auth.uid();
  END LOOP;
END $$;
REVOKE EXECUTE ON FUNCTION public.config_gravar(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.config_gravar(jsonb) TO authenticated;

-- Cada pessoa grava só a PRÓPRIA preferência de tela inicial (null volta ao padrão do cargo).
CREATE OR REPLACE FUNCTION public.preferencia_gravar(p_tela text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_chave text; v_atual jsonb;
BEGIN
  IF auth.uid() IS NULL OR public.perfil_atual() IS NULL THEN RAISE EXCEPTION 'Entre na plataforma para salvar a sua preferência.'; END IF;
  IF p_tela IS NOT NULL AND p_tela !~ '^/[a-z0-9/_-]{1,60}$' THEN RAISE EXCEPTION 'Tela inválida.'; END IF;
  v_chave := public.config_chave_do_escritorio('preferencias_usuarios');
  PERFORM pg_advisory_xact_lock(hashtext(v_chave));
  BEGIN
    SELECT c.valor::jsonb INTO v_atual FROM public.configuracoes c WHERE c.chave = v_chave;
  EXCEPTION WHEN others THEN v_atual := NULL;
  END;
  IF v_atual IS NULL OR jsonb_typeof(v_atual) <> 'object' THEN v_atual := '{}'::jsonb; END IF;
  IF p_tela IS NULL THEN v_atual := v_atual - auth.uid()::text;
  ELSE v_atual := jsonb_set(v_atual, ARRAY[auth.uid()::text], jsonb_build_object('telaInicial', p_tela), true);
  END IF;
  INSERT INTO public.configuracoes (chave, valor, atualizado_em, atualizado_por) VALUES (v_chave, v_atual::text, now(), auth.uid())
  ON CONFLICT (chave) DO UPDATE SET valor = excluded.valor, atualizado_em = now(), atualizado_por = auth.uid();
END $$;
REVOKE EXECUTE ON FUNCTION public.preferencia_gravar(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.preferencia_gravar(text) TO authenticated;

-- 7. A Fátima define os cargos da equipe (decisão do M): a conta de trabalho dela passa a administrar a sede,
--    como as outras duas contas dela já administram. Para desfazer: Área do administrador > função "Operação".
UPDATE public.usuarios_perfis SET funcao = 'admin'
 WHERE lower(email) = 'fatima@gmenezes.com.br' AND escritorio_id = '00000000-0000-0000-0000-000000000001' AND funcao = 'operador';
