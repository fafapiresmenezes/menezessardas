-- Bloco E (06/11/2026): formatação própria de cada pessoa, lida do Word (.docx) que ela envia em
-- Configurações → Meu estilo de escrita. Usada ao baixar peças em Word. Só a própria pessoa lê e grava.
create table if not exists public.formatacao_escrita (
  usuario_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  dados jsonb not null check (jsonb_typeof(dados) = 'object' and length(dados::text) <= 4000),
  origem text null check (origem is null or length(origem) <= 200),
  atualizado_em timestamptz not null default now()
);
alter table public.formatacao_escrita enable row level security;
create policy formatacao_propria_select on public.formatacao_escrita for select to authenticated using (usuario_id = auth.uid());
create policy formatacao_propria_insert on public.formatacao_escrita for insert to authenticated with check (usuario_id = auth.uid());
create policy formatacao_propria_update on public.formatacao_escrita for update to authenticated using (usuario_id = auth.uid()) with check (usuario_id = auth.uid());
create policy formatacao_propria_delete on public.formatacao_escrita for delete to authenticated using (usuario_id = auth.uid());
revoke all on public.formatacao_escrita from anon;
