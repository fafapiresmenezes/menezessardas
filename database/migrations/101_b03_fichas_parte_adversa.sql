-- Bloco B03 (06/11/2026): ficha da parte adversa só com fontes públicas e oficiais.
-- Base legal: exercício regular de direitos (LGPD art. 7º VI). Finalidade e caso obrigatórios; apaga em 5 anos.
create table if not exists public.fichas_parte_adversa (
  id bigint generated always as identity primary key,
  escritorio_id uuid not null default escritorio_atual(),
  parte text not null check (length(parte) between 4 and 200),
  documento text null check (documento is null or documento ~ '^[0-9]{14}$'),
  caso text not null check (length(caso) between 3 and 200),
  finalidade text not null check (length(finalidade) between 10 and 500),
  fontes text[] not null default '{}',
  resultado jsonb not null,
  consultado_por uuid not null default auth.uid(),
  consultado_em timestamptz not null default now(),
  apagar_em timestamptz not null default (now() + interval '5 years')
);
alter table public.fichas_parte_adversa enable row level security;
create policy fichas_adversa_select on public.fichas_parte_adversa for select to authenticated
  using (escritorio_id = escritorio_atual() and perfil_atual() = any (array['admin'::usuario_funcao, 'operador'::usuario_funcao]));
create policy fichas_adversa_insert on public.fichas_parte_adversa for insert to authenticated
  with check (escritorio_id = escritorio_atual() and consultado_por = auth.uid()
    and perfil_atual() = any (array['admin'::usuario_funcao, 'operador'::usuario_funcao]));
create policy fichas_adversa_delete on public.fichas_parte_adversa for delete to authenticated
  using (escritorio_id = escritorio_atual() and perfil_atual() = 'admin'::usuario_funcao);
revoke all on public.fichas_parte_adversa from anon;

create or replace function public.apagar_fichas_vencidas() returns integer
language sql security definer set search_path = public as $$
  with d as (delete from public.fichas_parte_adversa where apagar_em < now() returning 1) select count(*)::int from d
$$;
revoke all on function public.apagar_fichas_vencidas() from public, anon, authenticated;
do $$ begin
  if exists (select 1 from pg_namespace where nspname = 'cron') then
    perform cron.schedule('apagar-fichas-vencidas', '25 6 1 * *', 'select public.apagar_fichas_vencidas()');
  end if;
end $$;
