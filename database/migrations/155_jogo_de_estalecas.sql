-- =====================================================================================
-- COLE-ISTO-155: Jogo de estalecas da frente de Predição (20/11/2026, pedido de M)
--
-- O QUE FAZ, em palavras simples: cria as duas tabelas do novo quadrado do Instituto, onde os
-- membros fazem previsões com ESTALECAS (moeda de brincadeira, sem valor em dinheiro), e as funções que
-- contam as estalecas, mostram a chance que o grupo vê e o ranking.
--   · previsoes_perguntas : as perguntas, cada uma com a fonte pública que vai resolvê-la
--   · previsoes_palpites  : os palpites (resposta escolhida + estalecas colocadas)
--
-- REGRAS QUE O BANCO GARANTE:
--   · Só quem administra o Instituto (eh_admin_instituto) lê ou grava. O escritório Sardas e
--     Menezes e qualquer outro cliente não veem nada disto.
--   · Ninguém vê o palpite de outra pessoa; só a soma por resposta e o ranking por primeiro nome.
--   · Estalecas não têm valor em dinheiro: não existe coluna de dinheiro, depósito, saque, carteira
--     ou token. Cada pessoa começa com 1000 estalecas. Não é aposta.
--   · Palpite só com a pergunta aberta, de 1 a 200 estalecas, e só com saldo.
--
-- NÃO APAGA NADA e não mexe em nenhuma outra tabela. Pode rodar duas vezes sem medo.
-- PARA DESFAZER: rodar sozinho o bloco "DESFAZER" do fim deste arquivo (está comentado).
-- Depende de public.eh_admin_instituto(), que já existe (migração 118).
-- =====================================================================================

CREATE TABLE IF NOT EXISTS public.previsoes_perguntas (
  id            bigserial PRIMARY KEY,
  titulo        text NOT NULL CHECK (char_length(titulo) BETWEEN 10 AND 300),
  detalhe       text NOT NULL DEFAULT '' CHECK (char_length(detalhe) <= 2000),
  categoria     text NOT NULL DEFAULT 'Geral' CHECK (char_length(categoria) <= 60),
  opcoes        text[] NOT NULL DEFAULT ARRAY['Sim','Não'] CHECK (array_length(opcoes, 1) BETWEEN 2 AND 6),
  criterio      text NOT NULL CHECK (char_length(criterio) BETWEEN 15 AND 1000),
  fecha_em      timestamptz NOT NULL,
  resultado     smallint NULL,          -- índice da resposta certa; -1 = anulada (pontos devolvidos)
  resolvida_em  timestamptz NULL,
  criado_por    uuid NOT NULL DEFAULT auth.uid(),
  criado_em     timestamptz NOT NULL DEFAULT now(),
  CHECK (resultado IS NULL OR resultado >= -1)
);

CREATE TABLE IF NOT EXISTS public.previsoes_palpites (
  id           bigserial PRIMARY KEY,
  pergunta_id  bigint NOT NULL REFERENCES public.previsoes_perguntas(id) ON DELETE RESTRICT,
  usuario_id   uuid NOT NULL DEFAULT auth.uid(),
  opcao        smallint NOT NULL CHECK (opcao >= 0),
  pontos       integer NOT NULL CHECK (pontos BETWEEN 1 AND 200),
  criado_em    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS previsoes_palpites_pergunta ON public.previsoes_palpites (pergunta_id);
CREATE INDEX IF NOT EXISTS previsoes_palpites_usuario ON public.previsoes_palpites (usuario_id);

ALTER TABLE public.previsoes_perguntas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.previsoes_palpites  ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.previsoes_perguntas FROM anon;
REVOKE ALL ON public.previsoes_palpites  FROM anon;

-- Perguntas: o Instituto lê e cria. Resolver é só pela função (abaixo), para registrar a data.
DROP POLICY IF EXISTS instituto_le ON public.previsoes_perguntas;
CREATE POLICY instituto_le ON public.previsoes_perguntas FOR SELECT TO authenticated
  USING (public.eh_admin_instituto());
DROP POLICY IF EXISTS instituto_cria ON public.previsoes_perguntas;
CREATE POLICY instituto_cria ON public.previsoes_perguntas FOR INSERT TO authenticated
  WITH CHECK (public.eh_admin_instituto() AND criado_por = auth.uid() AND resultado IS NULL AND fecha_em > now());

-- Palpites: cada um vê só os próprios. Gravar é só pela função previsoes_palpitar (confere saldo).
DROP POLICY IF EXISTS so_os_meus ON public.previsoes_palpites;
CREATE POLICY so_os_meus ON public.previsoes_palpites FOR SELECT TO authenticated
  USING (public.eh_admin_instituto() AND usuario_id = auth.uid());

-- Saldo de pontos de uma pessoa (1000 iniciais - colocados + devolvidos).
CREATE OR REPLACE FUNCTION public.previsoes_saldo_de(p_usuario uuid)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH pote AS (
    SELECT pergunta_id, opcao, sum(pontos) AS v FROM public.previsoes_palpites GROUP BY pergunta_id, opcao
  ), total AS (
    SELECT pergunta_id, sum(v) AS t FROM pote GROUP BY pergunta_id
  )
  SELECT (1000 + coalesce(sum(
    - pa.pontos
    + CASE
        WHEN q.resultado IS NULL THEN 0
        WHEN q.resultado = -1 THEN pa.pontos
        WHEN pa.opcao <> q.resultado THEN 0
        ELSE floor(pa.pontos::numeric * t.t / nullif(pv.v, 0))::int
      END
  ), 0))::int
  FROM public.previsoes_palpites pa
  JOIN public.previsoes_perguntas q ON q.id = pa.pergunta_id
  JOIN total t ON t.pergunta_id = pa.pergunta_id
  LEFT JOIN pote pv ON pv.pergunta_id = pa.pergunta_id AND pv.opcao = q.resultado
  WHERE pa.usuario_id = p_usuario;
$$;
REVOKE ALL ON FUNCTION public.previsoes_saldo_de(uuid) FROM public, anon, authenticated;

CREATE OR REPLACE FUNCTION public.previsoes_meu_saldo()
RETURNS integer LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.eh_admin_instituto() THEN RAISE EXCEPTION 'Esta parte é só do Instituto.'; END IF;
  RETURN public.previsoes_saldo_de(auth.uid());
END $$;

-- Fazer um palpite: confere pergunta aberta, resposta válida, pontos e saldo.
CREATE OR REPLACE FUNCTION public.previsoes_palpitar(p_pergunta bigint, p_opcao smallint, p_pontos integer)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE q public.previsoes_perguntas; v_saldo int;
BEGIN
  IF NOT public.eh_admin_instituto() THEN RAISE EXCEPTION 'Esta parte é só do Instituto.'; END IF;
  -- Uma pessoa por vez: evita gastar o mesmo saldo em dois cliques ao mesmo tempo.
  PERFORM pg_advisory_xact_lock(hashtext('previsoes:' || auth.uid()::text));
  SELECT * INTO q FROM public.previsoes_perguntas WHERE id = p_pergunta;
  IF NOT FOUND THEN RAISE EXCEPTION 'Pergunta não encontrada.'; END IF;
  IF q.resultado IS NOT NULL OR q.fecha_em <= now() THEN RAISE EXCEPTION 'Esta pergunta já fechou.'; END IF;
  IF p_opcao < 0 OR p_opcao >= array_length(q.opcoes, 1) THEN RAISE EXCEPTION 'Escolha uma das respostas.'; END IF;
  IF p_pontos < 1 OR p_pontos > 200 THEN RAISE EXCEPTION 'De 1 a 200 estalecas por palpite.'; END IF;
  v_saldo := public.previsoes_saldo_de(auth.uid());
  IF p_pontos > v_saldo THEN RAISE EXCEPTION 'Você não tem estalecas suficientes.'; END IF;
  INSERT INTO public.previsoes_palpites (pergunta_id, usuario_id, opcao, pontos) VALUES (p_pergunta, auth.uid(), p_opcao, p_pontos);
  RETURN v_saldo - p_pontos;
END $$;

-- Painel: para cada pergunta, os pontos somados por resposta e quantas pessoas palpitaram.
CREATE OR REPLACE FUNCTION public.previsoes_painel()
RETURNS TABLE (pergunta_id bigint, opcao smallint, pontos bigint, pessoas bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.eh_admin_instituto() THEN RAISE EXCEPTION 'Esta parte é só do Instituto.'; END IF;
  RETURN QUERY
    SELECT pa.pergunta_id, pa.opcao, sum(pa.pontos)::bigint, count(DISTINCT pa.usuario_id)::bigint
      FROM public.previsoes_palpites pa GROUP BY pa.pergunta_id, pa.opcao;
END $$;

-- Ranking: primeiro nome e saldo, os 20 primeiros. Ninguém vê e-mail nem palpite alheio.
CREATE OR REPLACE FUNCTION public.previsoes_ranking()
RETURNS TABLE (nome text, saldo integer, palpites bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.eh_admin_instituto() THEN RAISE EXCEPTION 'Esta parte é só do Instituto.'; END IF;
  RETURN QUERY
    SELECT coalesce(nullif(split_part(trim(u.nome_completo), ' ', 1), ''), 'Membro')::text,
           public.previsoes_saldo_de(x.usuario_id),
           x.n
      FROM (SELECT usuario_id, count(*) AS n FROM public.previsoes_palpites GROUP BY usuario_id) x
      LEFT JOIN public.usuarios_perfis u ON u.id = x.usuario_id
     ORDER BY 2 DESC
     LIMIT 20;
END $$;

-- Resolver uma pergunta (ou anular com -1). Só depois de fechada e só uma vez.
CREATE OR REPLACE FUNCTION public.previsoes_resolver(p_pergunta bigint, p_resultado smallint)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE q public.previsoes_perguntas;
BEGIN
  IF NOT public.eh_admin_instituto() THEN RAISE EXCEPTION 'Esta parte é só do Instituto.'; END IF;
  SELECT * INTO q FROM public.previsoes_perguntas WHERE id = p_pergunta FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Pergunta não encontrada.'; END IF;
  IF q.resultado IS NOT NULL THEN RAISE EXCEPTION 'Esta pergunta já foi resolvida.'; END IF;
  IF p_resultado <> -1 AND q.fecha_em > now() THEN RAISE EXCEPTION 'Só dá para resolver depois da data de fechamento (anular pode a qualquer hora).'; END IF;
  IF p_resultado < -1 OR p_resultado >= array_length(q.opcoes, 1) THEN RAISE EXCEPTION 'Resposta inválida.'; END IF;
  UPDATE public.previsoes_perguntas SET resultado = p_resultado, resolvida_em = now() WHERE id = p_pergunta;
END $$;

REVOKE ALL ON FUNCTION public.previsoes_meu_saldo() FROM public, anon;
REVOKE ALL ON FUNCTION public.previsoes_palpitar(bigint, smallint, integer) FROM public, anon;
REVOKE ALL ON FUNCTION public.previsoes_painel() FROM public, anon;
REVOKE ALL ON FUNCTION public.previsoes_ranking() FROM public, anon;
REVOKE ALL ON FUNCTION public.previsoes_resolver(bigint, smallint) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.previsoes_meu_saldo() TO authenticated;
GRANT EXECUTE ON FUNCTION public.previsoes_palpitar(bigint, smallint, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.previsoes_painel() TO authenticated;
GRANT EXECUTE ON FUNCTION public.previsoes_ranking() TO authenticated;
GRANT EXECUTE ON FUNCTION public.previsoes_resolver(bigint, smallint) TO authenticated;
GRANT SELECT, INSERT ON public.previsoes_perguntas TO authenticated;
GRANT SELECT ON public.previsoes_palpites TO authenticated;
GRANT USAGE ON SEQUENCE public.previsoes_perguntas_id_seq TO authenticated;

-- Conferência final: tem de mostrar 2 tabelas com RLS ligada e 6 funções.
SELECT relname AS tabela, relrowsecurity AS rls_ligada FROM pg_class
 WHERE relname IN ('previsoes_perguntas', 'previsoes_palpites') ORDER BY 1;
SELECT proname AS funcao FROM pg_proc WHERE proname LIKE 'previsoes\_%' ORDER BY 1;

-- DESFAZER (rodar sozinho, só se quiser tirar tudo; apaga as perguntas e palpites de pontos):
-- DROP FUNCTION IF EXISTS public.previsoes_resolver(bigint, smallint), public.previsoes_ranking(),
--   public.previsoes_painel(), public.previsoes_palpitar(bigint, smallint, integer),
--   public.previsoes_meu_saldo(), public.previsoes_saldo_de(uuid);
-- DROP TABLE IF EXISTS public.previsoes_palpites, public.previsoes_perguntas;
