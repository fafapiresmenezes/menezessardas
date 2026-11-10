-- 109 — Conta nova sem aprovação (decisão do M em 10/11/2026).
-- Antes: quem criava conta ficava sem perfil (sem acesso, pela RLS) até um administrador dar a função em Equipe.
-- Agora: a conta nova já nasce como LEITOR da sede (GMenezes). O administrador continua podendo promover,
-- rebaixar ou retirar o acesso em Equipe (função "nenhuma").
-- Exceções:
--   * o primeiro usuário do banco continua virando administrador;
--   * quem tem convite de escritório parceiro pendente NÃO recebe perfil aqui: é o aceite do convite
--     (aceitar_convite_parceiro) que o coloca no escritório certo, sem passar pela sede.
-- Para voltar atrás: reaplicar a função da migração 012.
CREATE OR REPLACE FUNCTION public.criar_perfil_primeiro_acesso()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
  INSERT INTO public.usuarios_perfis (id, email, nome_completo, funcao, escritorio_id)
  VALUES (NEW.id, NEW.email, COALESCE(NULLIF(trim(NEW.raw_user_meta_data->>'nome'), ''), NEW.email),
          'leitor', '00000000-0000-0000-0000-000000000001')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.criar_perfil_primeiro_acesso() FROM PUBLIC, anon, authenticated;
