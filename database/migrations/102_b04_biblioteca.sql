-- Bloco B04 (06/11/2026): pasta interna "Já pesquisado". Guarda buscas e respostas para não se perderem.
-- CPF é mascarado no navegador antes de salvar; apaga em 5 anos.
create table if not exists public.biblioteca_pesquisas (
  id bigint generated always as identity primary key,
  escritorio_id uuid not null default escritorio_atual(),
  tipo text not null check (tipo in ('assistente','fontes','parte_adversa','nota')),
  titulo text not null check (length(titulo) between 2 and 300),
  conteudo text not null check (length(conteudo) <= 50000),
  etiquetas text[] not null default '{}',
  caso text null,
  criado_por uuid not null default auth.uid(),
  criado_em timestamptz not null default now(),
  apagar_em timestamptz not null default (now() + interval '5 years')
);
create index if not exists biblioteca_busca on public.biblioteca_pesquisas using gin (to_tsvector('portuguese', titulo || ' ' || conteudo));
alter table public.biblioteca_pesquisas enable row level security;
create policy biblioteca_select on public.biblioteca_pesquisas for select to authenticated
  using (escritorio_id = escritorio_atual() and perfil_atual() is not null);
create policy biblioteca_insert on public.biblioteca_pesquisas for insert to authenticated
  with check (escritorio_id = escritorio_atual() and criado_por = auth.uid() and perfil_atual() is not null);
create policy biblioteca_delete on public.biblioteca_pesquisas for delete to authenticated
  using (escritorio_id = escritorio_atual() and (criado_por = auth.uid() or perfil_atual() = 'admin'::usuario_funcao));
revoke all on public.biblioteca_pesquisas from anon;
