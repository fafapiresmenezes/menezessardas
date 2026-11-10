-- 111 — Conta nova nasce num escritório próprio e vazio (decisão do M em 10/11/2026).
-- M definiu que a plataforma é para outros escritórios e para o Instituto (estudo e pesquisa):
-- ninguém de fora pode entrar nos dados da sede. A migração 109 colocava a conta nova como
-- leitor DA SEDE, com acesso de leitura a tudo; agora a conta nova vira ADMINISTRADORA de um
-- escritório recém-criado e vazio, com o nome dela, e convida a própria equipe em Equipe.
-- Exceções (iguais às da 109):
--   * o primeiro usuário do banco continua virando administrador (da sede);
--   * quem tem convite de escritório parceiro pendente NÃO recebe perfil aqui: o aceite do
--     convite (aceitar_convite_parceiro) o coloca no escritório certo.
-- Atenção ao preço: a cobrança (migração 110) fatura todo escritório fora a sede, então um
-- escritório criado no cadastro entra na régua de R$ 200/usuário + instalação quando a 110 valer.
-- Para voltar atrás: reaplicar a função da migração 109 (ou da 012, para exigir aprovação).
CREATE OR REPLACE FUNCTION public.criar_perfil_primeiro_acesso()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
  v_nome := COALESCE(NULLIF(trim(NEW.raw_user_meta_data->>'nome'), ''), split_part(NEW.email, '@', 1));
  INSERT INTO public.escritorios (nome)
  VALUES (left('Escritório de ' || v_nome, 120))
  RETURNING id INTO v_escritorio;
  INSERT INTO public.usuarios_perfis (id, email, nome_completo, funcao, escritorio_id)
  VALUES (NEW.id, NEW.email, COALESCE(NULLIF(trim(NEW.raw_user_meta_data->>'nome'), ''), NEW.email),
          'admin', v_escritorio);
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.criar_perfil_primeiro_acesso() FROM PUBLIC, anon, authenticated;
