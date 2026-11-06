-- Bloco B15 (06/11/2026, pedido de M 04:41Z): leitor diário de mercados de predição (Polymarket, Kalshi) e Epoch AI.
-- Só leitura de APIs públicas e gratuitas; só números. Séries em instituto.motor_series (fonte 'mercados' e 'epoch_ai').
create table if not exists instituto.mercados_titulos (
  chave text primary key,            -- 'polymarket:<slug>' ou 'kalshi:<ticker>'
  titulo text not null,
  visto_em timestamptz not null default now()
);
alter table instituto.mercados_titulos enable row level security;

create or replace function public.instituto_mercados_titulos(p_titulos jsonb) returns void
language sql security definer set search_path = '' as $$
  insert into instituto.mercados_titulos (chave, titulo, visto_em)
  select key, left(value, 200), now() from jsonb_each_text(coalesce(p_titulos, '{}'::jsonb))
  on conflict (chave) do update set titulo = excluded.titulo, visto_em = now()
$$;
revoke all on function public.instituto_mercados_titulos(jsonb) from public, anon, authenticated;

-- Leitura pública: por mercado, probabilidade do dia, desvio-padrão de 30 dias, volume, dias observados;
-- e o erro de calibragem histórico (ECE em 10 faixas) dos mercados que acompanhamos e que já resolveram,
-- usando a probabilidade registrada 7 dias antes do desfecho. Sem mercado resolvido, ece = null (sem dados).
create or replace function public.instituto_mercados(p_dias int default 30) returns jsonb
language sql stable security definer set search_path = 'instituto', 'public', 'pg_temp'
as $$
  with p as (
    select split_part(serie, ':', 1) || ':' || split_part(serie, ':', 2) as chave, data_ref, valor
    from instituto.motor_series where fonte = 'mercados' and serie like '%:p' and data_ref >= current_date - greatest(7, least(365, coalesce(p_dias, 30)))
  ), vol as (
    select split_part(serie, ':', 1) || ':' || split_part(serie, ':', 2) as chave, valor, data_ref,
           row_number() over (partition by split_part(serie, ':', 1) || ':' || split_part(serie, ':', 2) order by data_ref desc) rn
    from instituto.motor_series where fonte = 'mercados' and serie like '%:volume'
  ), res as (
    select split_part(serie, ':', 1) || ':' || split_part(serie, ':', 2) as chave, min(data_ref) as dia, max(valor) as y
    from instituto.motor_series where fonte = 'mercados' and serie like '%:resolvido' group by 1
  ), ult as (
    select chave, (array_agg(valor order by data_ref desc))[1] as p_hoje, (array_agg(data_ref order by data_ref desc))[1] as dia,
           round(stddev_samp(valor), 4) as sd30, count(*) as dias, round(avg(valor), 4) as media
    from p group by chave
  ), abertos as (
    select u.*, t.titulo, v.valor as volume from ult u left join instituto.mercados_titulos t on t.chave = u.chave
    left join vol v on v.chave = u.chave and v.rn = 1 where u.chave not in (select chave from res)
  ), cal as (
    -- probabilidade 7 dias antes do desfecho (ou a mais antiga que temos até 7 dias antes), pareada com o resultado
    select r.chave, r.y, (select valor from instituto.motor_series s where s.fonte = 'mercados' and s.serie = r.chave || ':p' and s.data_ref <= r.dia - 7 order by s.data_ref desc limit 1) as p7
    from res r
  ), faixas as (
    select width_bucket(p7, 0, 1.0000001, 10) as f, count(*) n, avg(p7) pm, avg(y) ym from cal where p7 is not null group by 1
  )
  select jsonb_build_object(
    'atualizado_em', now(),
    'ultima_coleta', (select max(em) from instituto.motor_coletas where (fonte like 'polymarket:%' or fonte like 'kalshi:%') and ok),
    'aviso', 'Preço de mercado de predição é opinião agregada de apostadores, não decisão judicial nem previsão do Instituto.',
    'mercados', coalesce((select jsonb_agg(jsonb_build_object('chave', chave, 'titulo', titulo, 'p', p_hoje, 'dia', dia, 'sd30', sd30, 'media', media, 'dias', dias, 'volume', volume) order by coalesce(volume, 0) desc, chave) from abertos), '[]'::jsonb),
    'calibragem', jsonb_build_object(
      'resolvidos', (select count(*) from cal where p7 is not null),
      'ece', case when (select count(*) from cal where p7 is not null) >= 30
        then (select round(sum(n::numeric / (select count(*) from cal where p7 is not null) * abs(pm - ym)), 4) from faixas) end,
      'brier', case when (select count(*) from cal where p7 is not null) >= 30 then (select round(avg((p7 - y) ^ 2), 4) from cal where p7 is not null) end,
      'minimo', 30),
    'epoch_ai', (select jsonb_build_object('modelos_notaveis', (select valor from instituto.motor_series where fonte = 'epoch_ai' and serie = 'modelos_notaveis_n' order by data_ref desc limit 1),
                                           'log10_compute_max', (select valor from instituto.motor_series where fonte = 'epoch_ai' and serie = 'log10_compute_max' order by data_ref desc limit 1),
                                           'dia', (select max(data_ref) from instituto.motor_series where fonte = 'epoch_ai'))))
$$;
grant execute on function public.instituto_mercados(int) to anon, authenticated;

-- Robô diário às 05:30 UTC (02:30 no Rio).
do $$ begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobid) from cron.job where jobname = 'mercados-predicao-diario';
    perform cron.schedule('mercados-predicao-diario', '30 5 * * *', $cmd$
      select net.http_post(url:='https://hlraekzvgxdpiiigdxdo.supabase.co/functions/v1/mercados-predicao',
        headers:=jsonb_build_object('Content-Type','application/json','x-cron-secret',(select valor from public.configuracoes where chave='cron_segredo')),
        body:='{}'::jsonb, timeout_milliseconds:=150000) $cmd$);
  end if;
end $$;
