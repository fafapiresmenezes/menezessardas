-- 112: plataforma conectada ao CNJ o dia todo.
-- O DJEN (Comunica PJe) publica ao longo do dia e o DataJud atualiza durante o dia; consultar a cada 4 horas
-- (e não só às 7h) faz a intimação chegar no mesmo dia. Só muda a agenda dos dois robôs que já existem
-- (jobs "intimacoes-diarias" e "monitorar-processos"); o comando de cada um continua o mesmo.
-- Horários em UTC (Brasília = UTC-3). A busca pega os últimos 3 dias e não repete o que já foi guardado.
do $$
begin
  if not exists (select 1 from pg_extension where extname = 'pg_cron') then
    raise notice 'pg_cron não está ligado; nada a fazer.';
    return;
  end if;
  perform cron.alter_job((select jobid from cron.job where jobname = 'intimacoes-diarias'), schedule := '5 */4 * * *');
  perform cron.alter_job((select jobid from cron.job where jobname = 'monitorar-processos'), schedule := '30 10,16,22 * * *');
end $$;

-- Para conferir depois (últimas execuções e se deram certo):
--   select j.jobname, d.status, d.start_time, left(d.return_message, 120)
--   from cron.job_run_details d join cron.job j using (jobid)
--   where j.jobname in ('intimacoes-diarias','monitorar-processos') order by d.start_time desc limit 12;
