-- 012 — Primeiro acesso (S9). Aplicar após 002.
-- O primeiro usuário cadastrado vira administrador; os demais ficam sem perfil
-- (sem acesso, pela RLS) até que um administrador conceda a função.
CREATE OR REPLACE FUNCTION public.criar_perfil_primeiro_acesso()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.usuarios_perfis) THEN
    INSERT INTO public.usuarios_perfis (id, email, nome_completo, funcao)
    VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'nome', NEW.email), 'admin');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.criar_perfil_primeiro_acesso() FROM PUBLIC, anon, authenticated;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'tg_primeiro_acesso') THEN
    CREATE TRIGGER tg_primeiro_acesso AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE FUNCTION public.criar_perfil_primeiro_acesso();
  END IF;
END $$;
