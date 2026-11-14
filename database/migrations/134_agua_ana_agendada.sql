-- Passo C3 (água da ANA): só AGENDA a coleta. Não cria, não altera e não apaga tabela nem dado:
-- as tabelas são as da ontologia do C1 (migração 122) e a fonte 'ana_snirh' já está cadastrada lá.
--
-- O que entra: um horário no pg_cron que chama a Edge Function ana-agua uma vez por dia, de
-- madrugada, pedindo os últimos 30 dias. A ANA publica com atraso e revisa número já publicado,
-- então pedir uma janela e não só "ontem" é de propósito: a revisão entra como linha nova, com
-- outro observado_em, e a série guarda as duas versões.
--
-- Por que de madrugada e uma vez por dia: a medição do SAR é diária. Rodar de hora em hora só
-- gastaria chamada para reinserir zero (a coleta é idempotente pelo hash do conteúdo).
--
-- Para desfazer:  select cron.unschedule(jobid) from cron.job where jobname = 'agua-ana';
do $$
begin
  if not exists (select 1 from pg_extension where extname = 'pg_cron') then
    raise notice 'pg_cron não está ligado; ligue em Database → Extensions e rode este arquivo de novo.';
    return;
  end if;
  perform cron.unschedule(jobid) from cron.job where jobname = 'agua-ana';
  perform cron.schedule('agua-ana', '40 7 * * *', $cmd$
    select net.http_post(
      url := 'https://hlraekzvgxdpiiigdxdo.supabase.co/functions/v1/ana-agua',
      headers := jsonb_build_object('Content-Type','application/json','x-region','sa-east-1',
        'x-cron-secret',(select valor from public.configuracoes where chave='cron_segredo')),
      body := '{"modo":"coletar","limiteReservatorios":12}'::jsonb,
      timeout_milliseconds := 150000) $cmd$);
end $$;

-- Para conferir depois:
--   select j.jobname, d.status, d.start_time, left(d.return_message, 200) from cron.job_run_details d
--     join cron.job j using (jobid) where j.jobname = 'agua-ana' order by d.start_time desc limit 5;
--   select count(*), min(ocorrido_em), max(ocorrido_em) from instituto.eventos where fonte = 'ana_snirh';
