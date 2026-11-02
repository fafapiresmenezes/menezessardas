-- Passo C26: contagem diária de perguntas barradas pelo filtro de injeção (só motivo e total; nunca o texto).
create table if not exists instituto.agentes_injecao(dia date not null default current_date, motivo text not null, n int not null default 0, primary key(dia, motivo));
alter table instituto.agentes_injecao enable row level security;
create or replace function public.instituto_injecao_registrar(p_motivo text) returns void language sql security definer set search_path = '' as $$
  insert into instituto.agentes_injecao(dia, motivo, n) values (current_date, left(coalesce(p_motivo,'?'), 40), 1)
  on conflict (dia, motivo) do update set n = instituto.agentes_injecao.n + 1 $$;
revoke all on function public.instituto_injecao_registrar(text) from public, anon, authenticated;
grant execute on function public.instituto_injecao_registrar(text) to service_role;
create or replace function public.instituto_injecao_resumo() returns jsonb language sql security definer set search_path = '' as $$
  select coalesce(jsonb_object_agg(motivo, total), '{}'::jsonb) from (select motivo, sum(n) total from instituto.agentes_injecao where dia > current_date - 30 group by motivo) x $$;
grant execute on function public.instituto_injecao_resumo() to anon, authenticated;
