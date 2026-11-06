-- Bloco B14 (06/11/2026, pedido de M 04:41Z): enquetes e votação sobre temas do desenvolvimento do direito.
-- Um voto por conta; ninguém lê voto individual: só agregados saem, sempre com n. Enquetes "públicas" aparecem no site do Instituto só como agregado e só com n >= 10.
create table if not exists public.enquetes (
  id bigint generated always as identity primary key,
  escritorio_id uuid not null default escritorio_atual(),
  tema text not null check (length(tema) between 2 and 80),
  pergunta text not null check (length(pergunta) between 10 and 300),
  opcoes jsonb not null check (jsonb_typeof(opcoes) = 'array' and jsonb_array_length(opcoes) between 2 and 6),
  publica boolean not null default false,
  aberta_ate timestamptz not null default (now() + interval '14 days'),
  criado_por uuid not null default auth.uid(),
  criado_em timestamptz not null default now()
);
alter table public.enquetes enable row level security;
create policy enquetes_select on public.enquetes for select to authenticated
  using (escritorio_id = escritorio_atual() and perfil_atual() is not null);
create policy enquetes_insert on public.enquetes for insert to authenticated
  with check (escritorio_id = escritorio_atual() and criado_por = auth.uid() and perfil_atual() = 'admin'::usuario_funcao);
create policy enquetes_delete on public.enquetes for delete to authenticated
  using (escritorio_id = escritorio_atual() and perfil_atual() = 'admin'::usuario_funcao);
revoke all on public.enquetes from anon;

create table if not exists public.enquete_votos (
  enquete_id bigint not null references public.enquetes(id) on delete cascade,
  votante uuid not null default auth.uid(),
  opcao int not null check (opcao between 0 and 5),
  em timestamptz not null default now(),
  primary key (enquete_id, votante)
);
alter table public.enquete_votos enable row level security;
-- Cada pessoa vê só o próprio voto (para a tela saber que já votou); o agregado sai pela RPC.
create policy enquete_votos_select_proprio on public.enquete_votos for select to authenticated using (votante = auth.uid());
create policy enquete_votos_insert on public.enquete_votos for insert to authenticated
  with check (votante = auth.uid() and perfil_atual() is not null
    and exists (select 1 from public.enquetes e where e.id = enquete_id and e.escritorio_id = escritorio_atual() and e.aberta_ate > now()
      and opcao < jsonb_array_length(e.opcoes)));
revoke all on public.enquete_votos from anon;

-- Agregado para quem é do mesmo escritório: contagem por opção e n. Nunca devolve quem votou.
create or replace function public.enquete_resultado(p_id bigint) returns jsonb
language sql stable security definer set search_path = public as $$
  select case when not exists (select 1 from public.enquetes e where e.id = p_id and e.escritorio_id = escritorio_atual() and perfil_atual() is not null)
    then null
    else jsonb_build_object('enquete_id', p_id, 'n', (select count(*) from public.enquete_votos v where v.enquete_id = p_id),
      'contagens', (select coalesce(jsonb_agg(c order by i), '[]'::jsonb) from (
         select i, (select count(*) from public.enquete_votos v where v.enquete_id = p_id and v.opcao = i) as c
         from public.enquetes e, generate_series(0, jsonb_array_length(e.opcoes) - 1) i where e.id = p_id) z)) end
$$;
grant execute on function public.enquete_resultado(bigint) to authenticated;
revoke all on function public.enquete_resultado(bigint) from anon;

-- Site do Instituto: só enquetes públicas, só agregado, só com n >= 10 (abaixo disso sai "amostra pequena" sem contagens).
create or replace function public.instituto_enquetes() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('atualizado_em', now(), 'enquetes', coalesce(jsonb_agg(x order by (x->>'criado_em') desc), '[]'::jsonb)) from (
    select jsonb_build_object('tema', e.tema, 'pergunta', e.pergunta, 'opcoes', e.opcoes, 'aberta_ate', e.aberta_ate, 'criado_em', e.criado_em,
      'n', (select count(*) from public.enquete_votos v where v.enquete_id = e.id),
      'contagens', case when (select count(*) from public.enquete_votos v where v.enquete_id = e.id) >= 10
        then (select jsonb_agg(c order by i) from (select i, (select count(*) from public.enquete_votos v where v.enquete_id = e.id and v.opcao = i) c
              from generate_series(0, jsonb_array_length(e.opcoes) - 1) i) z) end) x
    from public.enquetes e where e.publica) s
$$;
grant execute on function public.instituto_enquetes() to anon, authenticated;
