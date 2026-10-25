-- 013: configurações do escritório guardadas no servidor (ex.: chave da IA).
-- A tabela tem RLS ligada e NENHUMA policy: anon e authenticated não leem nem
-- escrevem diretamente. Só o service role (usado pelas Edge Functions) lê o valor.
-- O administrador grava/remove por RPC (SECURITY DEFINER) e só enxerga o estado
-- (definida ou não + últimos 4 caracteres), nunca o valor.

CREATE TABLE IF NOT EXISTS public.configuracoes (
  chave TEXT PRIMARY KEY,
  valor TEXT NOT NULL,
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE public.configuracoes ENABLE ROW LEVEL SECURITY;

-- Grava uma configuração. Só administradores logados.
CREATE OR REPLACE FUNCTION public.definir_configuracao(p_chave TEXT, p_valor TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_valor TEXT := btrim(coalesce(p_valor, ''));
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Faça login para alterar configurações.';
  END IF;
  IF public.perfil_atual() IS DISTINCT FROM 'admin'::usuario_funcao THEN
    RAISE EXCEPTION 'Apenas administradores podem alterar configurações.';
  END IF;
  IF p_chave <> 'anthropic_api_key' THEN
    RAISE EXCEPTION 'Configuração desconhecida.';
  END IF;
  IF v_valor !~ '^sk-ant-[A-Za-z0-9_-]{20,}$' THEN
    RAISE EXCEPTION 'Formato de chave inválido: ela deve começar com sk-ant-.';
  END IF;

  INSERT INTO public.configuracoes (chave, valor, atualizado_em, atualizado_por)
  VALUES (p_chave, v_valor, now(), auth.uid())
  ON CONFLICT (chave) DO UPDATE
    SET valor = EXCLUDED.valor, atualizado_em = now(), atualizado_por = auth.uid();
END;
$$;

-- Remove uma configuração. Só administradores logados.
CREATE OR REPLACE FUNCTION public.remover_configuracao(p_chave TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Faça login para alterar configurações.';
  END IF;
  IF public.perfil_atual() IS DISTINCT FROM 'admin'::usuario_funcao THEN
    RAISE EXCEPTION 'Apenas administradores podem alterar configurações.';
  END IF;
  DELETE FROM public.configuracoes WHERE chave = p_chave;
END;
$$;

-- Estado de uma configuração: sempre 1 linha; nunca devolve o valor.
CREATE OR REPLACE FUNCTION public.estado_configuracao(p_chave TEXT)
RETURNS TABLE (permitido BOOLEAN, definida BOOLEAN, atualizado_em TIMESTAMPTZ, sufixo TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR public.perfil_atual() IS DISTINCT FROM 'admin'::usuario_funcao THEN
    RETURN QUERY SELECT false, false, NULL::TIMESTAMPTZ, NULL::TEXT;
    RETURN;
  END IF;
  RETURN QUERY
    SELECT true,
           (c.chave IS NOT NULL),
           c.atualizado_em,
           right(c.valor, 4)
    FROM (SELECT 1) AS um
    LEFT JOIN public.configuracoes c ON c.chave = p_chave;
END;
$$;

GRANT EXECUTE ON FUNCTION public.definir_configuracao(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.remover_configuracao(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.estado_configuracao(TEXT) TO authenticated;
