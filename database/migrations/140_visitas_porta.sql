-- 140: contagem de visitas da porta, sem identificar ninguém (passo V10 do plano mestre v6).
--
-- Para melhorar a porta é preciso saber quantas visitas ela recebe, em que língua a pessoa entra e
-- em qual quadradinho clica. Nada disso guarda identificador de pessoa, nem arquivo de rastreio, nem
-- serviço de terceiro: só três contadores somados por dia.
--
-- COMO FICA PRIVADO: a tabela `visitas_porta` guarda só (dia, tipo, chave, contagem). Uma visita soma
-- em ('visita',''); a escolha de língua soma em ('idioma', <código>); o clique num quadradinho soma em
-- ('quadradinho', <id da frente>). Esses três contadores são independentes e somados: não dá para
-- ligar a visita de uma pessoa ao que ela clicou, porque nada aqui diz quem é a pessoa.
--
-- LIMITE DE CHAMADAS: a função `porta_contar` é chamada sem login (pela função de servidor
-- `contar-visita`, que é porta). Para um robô não inflar o número, há um limite por rede e por minuto
-- numa tabela à parte, `visitas_porta_limite`, que guarda só o resumo da rede (hmac do IP, como em
-- pedir_entrada) e o minuto — nunca o que foi visto. Essa tabela se limpa sozinha a cada chamada.
--
-- SÓ ACRÉSCIMO: tabelas e funções novas; nada é apagado, renomeado ou revogado do que já existia.
-- Toda função nova já nasce com a permissão do público retirada (regra das migrações 135–137).

-- 1) Contadores somados por dia. Sem coluna de pessoa. RLS ligada e sem política: ninguém lê direto.
CREATE TABLE IF NOT EXISTS public.visitas_porta (
  dia   date   NOT NULL,
  tipo  text   NOT NULL CHECK (tipo IN ('visita', 'idioma', 'quadradinho')),
  chave text   NOT NULL DEFAULT '',
  n     bigint NOT NULL DEFAULT 0,
  PRIMARY KEY (dia, tipo, chave)
);
ALTER TABLE public.visitas_porta ENABLE ROW LEVEL SECURITY;

-- 2) Limite por rede e minuto. Guarda só o resumo da rede e o minuto; some sozinha.
CREATE TABLE IF NOT EXISTS public.visitas_porta_limite (
  rede   text        NOT NULL,
  minuto timestamptz NOT NULL,
  n      int         NOT NULL DEFAULT 0,
  PRIMARY KEY (rede, minuto)
);
ALTER TABLE public.visitas_porta_limite ENABLE ROW LEVEL SECURITY;

-- 3) Somar um (porta, chamável sem login pela função de servidor). Só soma; com limite por rede.
CREATE OR REPLACE FUNCTION public.porta_contar(p_tipo text, p_chave text, p_rede text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_minuto timestamptz := date_trunc('minute', now());
  v_tipo text := lower(coalesce(p_tipo, ''));
  v_chave text;
  v_n int;
BEGIN
  IF v_tipo NOT IN ('visita', 'idioma', 'quadradinho') THEN
    RETURN jsonb_build_object('ok', false);
  END IF;
  -- 'visita' não tem chave; as outras levam só letras, números, hífen e sublinhado, no máximo 40.
  v_chave := CASE WHEN v_tipo = 'visita' THEN ''
                  ELSE left(regexp_replace(coalesce(p_chave, ''), '[^a-zA-Z0-9_-]', '', 'g'), 40) END;

  IF p_rede IS NOT NULL AND btrim(p_rede) <> '' THEN
    DELETE FROM public.visitas_porta_limite WHERE minuto < now() - interval '10 minutes';
    INSERT INTO public.visitas_porta_limite (rede, minuto, n) VALUES (p_rede, v_minuto, 1)
      ON CONFLICT (rede, minuto) DO UPDATE SET n = public.visitas_porta_limite.n + 1
      RETURNING n INTO v_n;
    IF v_n > 60 THEN
      RETURN jsonb_build_object('ok', false, 'motivo', 'limite');
    END IF;
  END IF;

  INSERT INTO public.visitas_porta (dia, tipo, chave, n) VALUES (current_date, v_tipo, v_chave, 1)
    ON CONFLICT (dia, tipo, chave) DO UPDATE SET n = public.visitas_porta.n + 1;
  RETURN jsonb_build_object('ok', true);
END $$;

-- 4) Ler os contadores (painel): só o administrador do Instituto, logado.
CREATE OR REPLACE FUNCTION public.visitas_porta_listar(p_dias int DEFAULT 30)
RETURNS TABLE(dia date, tipo text, chave text, n bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT v.dia, v.tipo, v.chave, v.n
    FROM public.visitas_porta v
   WHERE public.eh_admin_instituto()
     AND v.dia >= current_date - (greatest(1, least(coalesce(p_dias, 30), 365)) - 1)
   ORDER BY v.dia DESC, v.tipo, v.n DESC
$$;

-- 5) Retirar a permissão do público (regra das migrações 135–137).
REVOKE ALL ON public.visitas_porta FROM PUBLIC;
REVOKE ALL ON public.visitas_porta_limite FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.porta_contar(text, text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.visitas_porta_listar(int) FROM PUBLIC;
-- somar é só para a função de servidor (service_role); ler é só para quem está logado.
GRANT EXECUTE ON FUNCTION public.porta_contar(text, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.visitas_porta_listar(int) TO authenticated;

-- COMO CONFERIR DEPOIS DE APLICAR:
--   select public.porta_contar('visita', '', 'rede-teste');          -- {"ok": true}
--   select public.porta_contar('idioma', 'pt', 'rede-teste');        -- {"ok": true}
--   select * from public.visitas_porta;                              -- duas linhas, contagem 1
--   select has_function_privilege('anon','public.porta_contar(text,text,text)','EXECUTE'); -- false
--
-- ESTADO: aplicada em 14/11/2026 via conector Supabase (projeto hlraekzvgxdpiiigdxdo). Só acréscimo.
