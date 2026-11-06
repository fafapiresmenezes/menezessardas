-- Passo D22 (Diamante): white-label para escritórios parceiros — logo, cor e domínio próprio por escritório
-- (a cobrança por usuário já existe). Idempotente.
ALTER TABLE public.escritorios ADD COLUMN IF NOT EXISTS dominio text;
CREATE UNIQUE INDEX IF NOT EXISTS escritorios_dominio_idx ON public.escritorios (lower(dominio)) WHERE dominio IS NOT NULL;

-- Só a sede define o domínio de um parceiro (o DNS do domínio aponta para a plataforma; a sede confere antes).
CREATE OR REPLACE FUNCTION public.definir_dominio(p_escritorio uuid, p_dominio text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v text := lower(trim(coalesce(p_dominio, '')));
BEGIN
  IF public.perfil_atual() <> 'admin'::usuario_funcao OR NOT public.eh_sede() THEN RAISE EXCEPTION 'Apenas administradores da sede definem domínios.'; END IF;
  IF v <> '' AND v !~ '^([a-z0-9-]+\.)+[a-z]{2,}$' THEN RAISE EXCEPTION 'Domínio inválido: use algo como advocacia.com.br (sem https nem barra).'; END IF;
  IF v <> '' AND EXISTS (SELECT 1 FROM public.escritorios WHERE lower(dominio) = v AND id <> p_escritorio) THEN RAISE EXCEPTION 'Este domínio já está em uso por outro escritório.'; END IF;
  UPDATE public.escritorios SET dominio = nullif(v, '') WHERE id = p_escritorio;
END $$;

-- Marca do escritório da pessoa logada (sede recebe sede=true e a tela mantém o lockup GMenezes).
CREATE OR REPLACE FUNCTION public.minha_marca()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT public.marca_escritorio(public.escritorio_atual())
$$;

-- Marca pelo domínio de acesso, para a tela de login antes de entrar (sem dado pessoal; só nome, cor e logo).
CREATE OR REPLACE FUNCTION public.marca_por_dominio(p_dominio text)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT public.marca_escritorio(e.id) FROM public.escritorios e
  WHERE lower(e.dominio) = lower(trim(p_dominio)) AND e.id <> '00000000-0000-0000-0000-000000000001' LIMIT 1
$$;
GRANT EXECUTE ON FUNCTION public.marca_por_dominio(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.minha_marca() TO authenticated;
GRANT EXECUTE ON FUNCTION public.definir_dominio(uuid, text) TO authenticated;
