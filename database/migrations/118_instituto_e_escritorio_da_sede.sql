-- 118: quem administra o quê dentro da casa principal.
-- A casa principal guarda duas coisas: o escritório de advocacia (SARDAS E MENEZES) e o Instituto THEYE, dono da plataforma.
-- Quem administra o escritório libera pessoas e define cargos; quem administra o Instituto cuida da plataforma inteira
-- (custo de API, funil do Instituto, escritórios parceiros).
-- A lista de quem administra o Instituto fica em configuracoes.instituto_admins (lista JSON de e-mails), gravada fora deste
-- arquivo. Enquanto a lista não existir, todo administrador da casa principal conta como administrador do Instituto,
-- que é o comportamento de antes.
-- Só acréscimos: nada é apagado, renomeado ou revogado.

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
    RETURN true;
  END IF;
  SELECT lower(u.email::text) INTO v_email FROM auth.users u WHERE u.id = auth.uid();
  RETURN EXISTS (SELECT 1 FROM jsonb_array_elements_text(v_lista) AS e(valor) WHERE lower(btrim(e.valor)) = v_email);
END $$;

-- Em qual escritório a pessoa está, com o nome que ela deve ler na tela.
CREATE OR REPLACE FUNCTION public.meu_escritorio()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  c_sede constant uuid := '00000000-0000-0000-0000-000000000001';
  v_pessoa text; v_email text; v_funcao usuario_funcao; v_esc uuid;
  v_nome text; v_advocacia text; v_inst boolean;
BEGIN
  IF auth.uid() IS NULL THEN RETURN NULL; END IF;
  SELECT p.nome_completo, p.email, p.funcao, p.escritorio_id INTO v_pessoa, v_email, v_funcao, v_esc
    FROM public.usuarios_perfis p WHERE p.id = auth.uid();
  IF v_esc IS NULL THEN RETURN NULL; END IF;
  IF v_esc <> c_sede THEN
    SELECT coalesce(nullif(btrim(e.nome_exibicao), ''), e.nome) INTO v_nome FROM public.escritorios e WHERE e.id = v_esc;
    RETURN jsonb_build_object('nome', upper(coalesce(v_nome, '')), 'sede', false, 'instituto', false,
                              'pessoa', coalesce(nullif(btrim(v_pessoa), ''), v_email), 'email', v_email, 'funcao', v_funcao);
  END IF;
  SELECT nullif(btrim(c.valor), '') INTO v_advocacia FROM public.configuracoes c WHERE c.chave = 'escritorio_sede_nome';
  v_advocacia := upper(coalesce(v_advocacia, 'SARDAS E MENEZES'));
  v_inst := public.eh_admin_instituto();
  RETURN jsonb_build_object('nome', CASE WHEN v_inst THEN 'INSTITUTO THEYE' ELSE v_advocacia END, 'sede', true, 'instituto', v_inst,
                            'advocacia', v_advocacia, 'pessoa', coalesce(nullif(btrim(v_pessoa), ''), v_email), 'email', v_email, 'funcao', v_funcao);
END $$;

-- Pedidos para entrar: quem administra o escritório vê os do próprio escritório; só o Instituto vê os de todos.
CREATE OR REPLACE FUNCTION public.pedidos_entrada_pendentes()
RETURNS TABLE(usuario_id uuid, email text, nome text, nome_digitado text, criado_em timestamptz, escritorio_id uuid, escritorio_nome text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT pe.usuario_id, pe.email, pe.nome, pe.nome_digitado, pe.criado_em, pe.escritorio_id, e.nome
    FROM public.pedidos_entrada pe JOIN public.escritorios e ON e.id = pe.escritorio_id
   WHERE pe.decidido_em IS NULL
     AND public.perfil_atual() = 'admin'::usuario_funcao
     AND (public.eh_admin_instituto() OR pe.escritorio_id = public.escritorio_atual())
   ORDER BY pe.criado_em
$$;
