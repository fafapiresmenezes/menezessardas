-- 014: equipe (S10). Administradores veem todas as pessoas cadastradas (inclusive
-- quem fez "Primeiro acesso" e ainda não tem função) e definem a função de cada uma.
-- Função NULL = sem acesso (a RLS das tabelas exige perfil). Nada é apagado.

CREATE OR REPLACE FUNCTION public.listar_usuarios()
RETURNS TABLE (
  id UUID, email TEXT, nome_completo TEXT, funcao usuario_funcao,
  criado_em TIMESTAMPTZ, confirmado BOOLEAN, ultimo_acesso TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u.id, u.email::text,
         COALESCE(p.nome_completo, u.raw_user_meta_data->>'nome'),
         p.funcao, u.created_at, (u.email_confirmed_at IS NOT NULL), u.last_sign_in_at
  FROM auth.users u
  LEFT JOIN public.usuarios_perfis p ON p.id = u.id
  WHERE public.perfil_atual() = 'admin'::usuario_funcao
  ORDER BY u.created_at;
$$;

CREATE OR REPLACE FUNCTION public.definir_funcao(p_id UUID, p_funcao TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email TEXT;
  v_nome TEXT;
  v_funcao usuario_funcao;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Faça login para alterar acessos.';
  END IF;
  IF public.perfil_atual() IS DISTINCT FROM 'admin'::usuario_funcao THEN
    RAISE EXCEPTION 'Apenas administradores podem alterar acessos.';
  END IF;
  IF p_funcao IS NOT NULL AND p_funcao NOT IN ('admin', 'operador', 'leitor') THEN
    RAISE EXCEPTION 'Função desconhecida.';
  END IF;
  v_funcao := p_funcao::usuario_funcao;

  IF p_id = auth.uid() AND v_funcao IS DISTINCT FROM 'admin'::usuario_funcao
     AND (SELECT count(*) FROM public.usuarios_perfis WHERE funcao = 'admin'::usuario_funcao) <= 1 THEN
    RAISE EXCEPTION 'Você é a única pessoa administradora: promova outra antes de mudar a sua função.';
  END IF;

  SELECT u.email::text, COALESCE(u.raw_user_meta_data->>'nome', u.email::text)
    INTO v_email, v_nome
  FROM auth.users u WHERE u.id = p_id;
  IF v_email IS NULL THEN
    RAISE EXCEPTION 'Pessoa não encontrada.';
  END IF;

  INSERT INTO public.usuarios_perfis (id, email, nome_completo, funcao)
  VALUES (p_id, v_email, v_nome, v_funcao)
  ON CONFLICT (id) DO UPDATE SET funcao = EXCLUDED.funcao;

  -- Ao receber uma função, a pessoa já foi reconhecida por um administrador:
  -- o e-mail fica confirmado sem depender do link do e-mail de cadastro.
  IF v_funcao IS NOT NULL THEN
    UPDATE auth.users SET email_confirmed_at = COALESCE(email_confirmed_at, now()) WHERE id = p_id;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.listar_usuarios() TO authenticated;
GRANT EXECUTE ON FUNCTION public.definir_funcao(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.perfil_atual() TO authenticated;
