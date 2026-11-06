-- Bloco B02 (06/11/2026): perfil de atendimento do cliente, só com consentimento (termo B01).
-- Sem biometria, sem dado sensível, sem decisão automática. Apaga sozinho na data apagar_em.
create table if not exists public.perfis_cliente (
  id bigint generated always as identity primary key,
  escritorio_id uuid not null default escritorio_atual(),
  cliente_nome text not null check (length(cliente_nome) between 2 and 200),
  termo_versao text not null default 'B01-2026-11-06',
  consentimento_em timestamptz not null,
  respostas jsonb not null,
  resultado jsonb not null,
  criado_por uuid not null default auth.uid(),
  criado_em timestamptz not null default now(),
  apagar_em timestamptz not null default (now() + interval '2 years')
);
alter table public.perfis_cliente enable row level security;
create policy perfis_cliente_select on public.perfis_cliente for select to authenticated
  using (escritorio_id = escritorio_atual() and perfil_atual() is not null);
create policy perfis_cliente_insert on public.perfis_cliente for insert to authenticated
  with check (escritorio_id = escritorio_atual() and criado_por = auth.uid()
    and perfil_atual() = any (array['admin'::usuario_funcao, 'operador'::usuario_funcao]));
create policy perfis_cliente_delete on public.perfis_cliente for delete to authenticated
  using (escritorio_id = escritorio_atual() and (criado_por = auth.uid() or perfil_atual() = 'admin'::usuario_funcao));
revoke all on public.perfis_cliente from anon;

create or replace function public.apagar_perfis_vencidos() returns integer
language sql security definer set search_path = public as $$
  with d as (delete from public.perfis_cliente where apagar_em < now() returning 1) select count(*)::int from d
$$;
revoke all on function public.apagar_perfis_vencidos() from public, anon, authenticated;
do $$ begin
  if exists (select 1 from pg_namespace where nspname = 'cron') then
    perform cron.schedule('apagar-perfis-vencidos', '20 6 * * *', 'select public.apagar_perfis_vencidos()');
  end if;
end $$;
