-- C06 (ciclo I-03): prazos de retenção do Instituto THEYE, aplicados todo dia por cron.
create table if not exists instituto.retencao_log(em timestamptz primary key default now(), apagados jsonb not null);
alter table instituto.retencao_log enable row level security;

create or replace function instituto.aplicar_retencao() returns jsonb
language plpgsql security definer set search_path = instituto, public as $$
declare r jsonb; a int; b int; c int; d int; e int; f int;
begin
  delete from tentativas_cadastro where criado_em < now() - interval '30 days'; get diagnostics a = row_count;
  delete from desafios_usados where usado_em < now() - interval '30 days'; get diagnostics b = row_count;
  delete from agentes_cota where dia < current_date - 90; get diagnostics c = row_count;
  -- cadastro nunca confirmado: 7 dias (conta de teste só sai com OK de M)
  delete from consultas where membro_id in (select id from membros where confirmado_em is null and criado_em < now() - interval '7 days' and email <> 'teste.lab@example.com');
  delete from membros where confirmado_em is null and criado_em < now() - interval '7 days' and email <> 'teste.lab@example.com'; get diagnostics d = row_count;
  -- consultas: 24 meses
  delete from consultas where criado_em < now() - interval '24 months'; get diagnostics e = row_count;
  -- cadastro inativo: 24 meses sem sessão nem plano ativo
  delete from consultas where membro_id in (select id from membros where criado_em < now() - interval '24 months' and coalesce(sessao_expira, criado_em) < now() - interval '24 months' and coalesce(membro_ate, '-infinity') < now() and email <> 'teste.lab@example.com');
  delete from membros where criado_em < now() - interval '24 months' and coalesce(sessao_expira, criado_em) < now() - interval '24 months' and coalesce(membro_ate, '-infinity') < now() and email <> 'teste.lab@example.com'; get diagnostics f = row_count;
  -- sessões vencidas perdem o código
  update membros set sessao_hash = null where sessao_expira < now() and sessao_hash is not null;
  r := jsonb_build_object('tentativas', a, 'desafios', b, 'cotas_agentes', c, 'cadastros_nao_confirmados', d, 'consultas_24m', e, 'cadastros_inativos_24m', f);
  insert into retencao_log(apagados) values (r);
  return r;
end $$;
revoke all on function instituto.aplicar_retencao() from public, anon, authenticated;

select cron.schedule('instituto-retencao', '17 6 * * *', $$select instituto.aplicar_retencao()$$);
