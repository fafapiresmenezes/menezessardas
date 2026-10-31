-- U11 · Motor THE EYE na nuvem: 10 fontes públicas coletadas a cada 6 h (como o PC), sem dado pessoal.
create table if not exists instituto.motor_coletas (
  id bigserial primary key, fonte text not null, ok boolean not null, status int, itens int, sha256 text,
  erro text, ms int, em timestamptz not null default now());
create table if not exists instituto.motor_series (
  fonte text not null, serie text not null, data_ref date not null, valor numeric, coletado_em timestamptz not null default now(),
  primary key (fonte, serie, data_ref));
alter table instituto.motor_coletas enable row level security;
alter table instituto.motor_series enable row level security;
create index if not exists motor_coletas_fonte_em on instituto.motor_coletas (fonte, em desc);
-- Resumo público só agregado.
create or replace function public.instituto_motor_resumo() returns jsonb language sql security definer set search_path = '' stable as $$
  select coalesce(jsonb_agg(jsonb_build_object('fonte', fonte, 'coletas', n, 'ok', k, 'taxa', round(k::numeric/n, 4), 'ultima', u) order by fonte), '[]'::jsonb)
  from (select fonte, count(*) n, count(*) filter (where ok) k, max(em) u from instituto.motor_coletas where em > now() - interval '7 days' group by fonte) z $$;
grant execute on function public.instituto_motor_resumo() to anon, authenticated;
-- Gravação só pelo servidor (Edge com service role).
create or replace function public.instituto_motor_gravar(p_coleta jsonb, p_series jsonb default '[]') returns void language plpgsql security definer set search_path = '' as $$
begin
  insert into instituto.motor_coletas (fonte, ok, status, itens, sha256, erro, ms)
  values (p_coleta->>'fonte', (p_coleta->>'ok')::boolean, (p_coleta->>'status')::int, (p_coleta->>'itens')::int, p_coleta->>'sha256', p_coleta->>'erro', (p_coleta->>'ms')::int);
  insert into instituto.motor_series (fonte, serie, data_ref, valor)
  select s->>'fonte', s->>'serie', (s->>'data_ref')::date, (s->>'valor')::numeric from jsonb_array_elements(coalesce(p_series,'[]')) s
  where s->>'valor' is not null
  on conflict (fonte, serie, data_ref) do update set valor = excluded.valor, coletado_em = now();
end $$;
revoke all on function public.instituto_motor_gravar(jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.instituto_motor_gravar(jsonb, jsonb) to service_role;
-- Agenda (job 24): a cada 6 h, minuto 15 (03, 09, 15, 21 UTC), como o PC.
-- select cron.schedule('instituto-coletor-motor', '15 3,9,15,21 * * *', $c$ select net.http_post(.../functions/v1/coletor-motor, x-cron-secret) $c$);
