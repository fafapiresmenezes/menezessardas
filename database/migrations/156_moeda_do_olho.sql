-- 156 · Moeda do Olho (pedido de M, 20/11/2026 01h05)
-- O crédito do jogo de previsões passa a se chamar Moeda do Olho e ganha recarga GRÁTIS de 100
-- toda segunda-feira 00h de Brasília (primeira em 23/11/2026). Continua sem compra, venda, saque,
-- transferência ou conversão. Precisa do SQL 155 colado antes.

CREATE OR REPLACE FUNCTION public.previsoes_recargas()
RETURNS integer LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT CASE WHEN now() < timestamptz '2026-11-23 03:00:00+00' THEN 0
              ELSE floor(extract(epoch FROM now() - timestamptz '2026-11-23 03:00:00+00') / 604800)::int + 1 END;
$$;
GRANT EXECUTE ON FUNCTION public.previsoes_recargas() TO authenticated;

CREATE OR REPLACE FUNCTION public.previsoes_saldo_de(p_usuario uuid)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH pote AS (
    SELECT pergunta_id, opcao, sum(pontos) AS v FROM public.previsoes_palpites GROUP BY pergunta_id, opcao
  ), total AS (
    SELECT pergunta_id, sum(v) AS t FROM pote GROUP BY pergunta_id
  )
  SELECT (1000 + 100 * public.previsoes_recargas() + coalesce(sum(
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

-- DESFAZER: cole de novo o bloco previsoes_saldo_de do SQL 155 e rode
--   DROP FUNCTION public.previsoes_recargas();
