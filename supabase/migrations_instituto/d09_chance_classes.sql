-- Passo D09 (I-04): chance por tipo de ação para a matriz situação × caminho em /legislacao.html. Só agregados.
create or replace function public.instituto_chance_classes()
returns jsonb language sql stable security definer set search_path = instituto, public as $$
  with a as (select classe, count(*) acoes, count(*) filter (where desfecho in ('procedencia','parcial','improcedencia'))::float8 n,
                    count(*) filter (where desfecho in ('procedencia','parcial'))::float8 k, count(distinct tribunal) tribunais from processos group by classe),
  w as (select *, case when n > 0 then k / n end p from a)
  select jsonb_build_object('base_em', current_date, 'fonte', 'DataJud (CNJ), ações de locação coletadas pelo THEYE Institute; procedência = pedido de quem entrou com a ação aceito total ou parcialmente, entre julgamentos de mérito; intervalo de 95% de Wilson.',
    'classes', coalesce(jsonb_agg(jsonb_build_object('classe', classe, 'acoes', acoes, 'n', n::int, 'tribunais', tribunais,
      'p', case when n >= 10 then round(p::numeric, 3) end,
      'ic95', case when n >= 10 then jsonb_build_array(
         round(((p + 1.96^2/(2*n) - 1.96*sqrt(p*(1-p)/n + 1.96^2/(4*n*n))) / (1 + 1.96^2/n))::numeric, 3),
         round(((p + 1.96^2/(2*n) + 1.96*sqrt(p*(1-p)/n + 1.96^2/(4*n*n))) / (1 + 1.96^2/n))::numeric, 3)) end,
      'amostra', case when n < 10 then 'insuficiente' when n < 30 then 'pequena' else 'adequada' end) order by acoes desc), '[]'))
  from w;
$$;
revoke all on function public.instituto_chance_classes() from public;
grant execute on function public.instituto_chance_classes() to anon, authenticated, service_role;
