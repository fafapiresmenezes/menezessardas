-- 115: funcionário com e-mail @gmenezes.com ou @lsm.law entra direto no escritório (Menezes Sardas Advogados)
-- como operador (trabalha os processos), sem aprovação. Decisão do M em 11/11/2026.
-- O e-mail precisa ser confirmado no cadastro, então só quem recebe e-mail nesses domínios entra.
-- Demais e-mails: continua a 111 (escritório próprio vazio).
CREATE OR REPLACE FUNCTION public.criar_perfil_primeiro_acesso()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_escritorio uuid;
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
  INSERT INTO public.escritorios (nome)
  VALUES (left('Escritório de ' || v_nome, 120))
  RETURNING id INTO v_escritorio;
  INSERT INTO public.usuarios_perfis (id, email, nome_completo, funcao, escritorio_id)
  VALUES (NEW.id, NEW.email, COALESCE(NULLIF(trim(NEW.raw_user_meta_data->>'nome'), ''), NEW.email),
          'admin', v_escritorio);
  RETURN NEW;
END;
$function$;
