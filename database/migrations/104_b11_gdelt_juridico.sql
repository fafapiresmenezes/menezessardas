-- Bloco B11 (06/11/2026): índice diário de notícias jurídicas por tema (GDELT), lido pelo site do Instituto THEYE.
-- As séries ficam em instituto.motor_series (fonte 'gdelt', serie 'noticias_<tema>'), gravadas pela Edge Function gdelt-juridico.
create or replace function public.instituto_gdelt_indice(p_dias int default 30)
returns jsonb
language sql stable security definer
set search_path to 'instituto', 'public', 'pg_temp'
as $$
  with s as (
    select replace(serie, 'noticias_', '') as tema, data_ref, valor
    from instituto.motor_series
    where fonte = 'gdelt' and serie like 'noticias_%' and data_ref >= current_date - greatest(2, least(365, coalesce(p_dias, 30)))
  ), por_tema as (
    select tema,
      jsonb_agg(jsonb_build_object('data', data_ref, 'valor', valor) order by data_ref) as serie,
      (array_agg(valor order by data_ref desc))[1] as ultimo,
      (array_agg(data_ref order by data_ref desc))[1] as ultimo_dia,
      round(avg(valor), 4) as media,
      count(*) as dias
    from s group by tema
  )
  select jsonb_build_object(
    'atualizado_em', now(),
    'fonte', 'GDELT 2.0 DOC API, volume do noticiário brasileiro em português por tema; só médias diárias, sem URL nem nome',
    'ultima_coleta', (select max(em) from instituto.motor_coletas where fonte like 'gdelt:%' and ok),
    'temas', coalesce((select jsonb_agg(jsonb_build_object('tema', tema, 'serie', serie, 'ultimo', ultimo, 'ultimo_dia', ultimo_dia, 'media', media, 'dias', dias,
      'variacao', case when media > 0 then round((ultimo - media) / media, 4) end) order by tema) from por_tema), '[]'::jsonb))
$$;
grant execute on function public.instituto_gdelt_indice(int) to anon, authenticated;

-- Robô diário (05:10 UTC = 02:10 no Rio), uma consulta por tema, 3 dias de janela para fechar o dia anterior.
do $$ begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobid) from cron.job where jobname = 'gdelt-juridico-diario';
    perform cron.schedule('gdelt-juridico-diario', '10 5 * * *', $cmd$
      select net.http_post(url:='https://hlraekzvgxdpiiigdxdo.supabase.co/functions/v1/gdelt-juridico?dias=3',
        headers:=jsonb_build_object('Content-Type','application/json','x-cron-secret',(select valor from public.configuracoes where chave='cron_segredo')),
        body:='{}'::jsonb, timeout_milliseconds:=150000) $cmd$);
  end if;
end $$;
