-- Área colaborativa, camada 1 (plano aprovado por M em 20/11/2026).
-- A página /bancadas-colaborativas já grava em bancadas_inscritos; esta migração cria a tabela
-- com as travas combinadas com a segurança: anon só INSERT (por coluna), leitura e decisão só
-- sede/admin, limites de tamanho e trava de enchente. Aprovar NÃO cria conta (convites intocados).
create table if not exists public.bancadas_inscritos (
  id uuid primary key default gen_random_uuid(),
  nome_completo text not null check (char_length(nome_completo) between 2 and 120),
  titulo_academico text not null check (char_length(titulo_academico) <= 120),
  instituicao text not null check (char_length(instituicao) <= 160),
  pais text not null check (char_length(pais) <= 80),
  areas_interesse text[] not null check (array_length(areas_interesse, 1) between 1 and 7),
  cv_linkedin text check (cv_linkedin is null or char_length(cv_linkedin) <= 300),
  email text not null check (char_length(email) between 5 and 200),
  concorda_termos boolean not null default false check (concorda_termos),
  data_inscricao timestamptz not null default now(),
  status text not null default 'pendente' check (status in ('pendente','aprovado','recusado')),
  criado_em timestamptz not null default now()
);

alter table public.bancadas_inscritos enable row level security;

revoke all on public.bancadas_inscritos from anon, authenticated;
grant insert (nome_completo, titulo_academico, instituicao, pais, areas_interesse, cv_linkedin, email, concorda_termos, data_inscricao)
  on public.bancadas_inscritos to anon, authenticated;
grant select, update (status) on public.bancadas_inscritos to authenticated;

create policy bancadas_insert_qualquer_um on public.bancadas_inscritos
  for insert to anon, authenticated with check (true);
create policy bancadas_leitura_sede on public.bancadas_inscritos
  for select to authenticated using (public.eh_sede());
create policy bancadas_decisao_sede on public.bancadas_inscritos
  for update to authenticated using (public.eh_sede()) with check (public.eh_sede());

create or replace function public.tg_bancadas_inscritos_limite()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.bancadas_inscritos where criado_em > now() - interval '1 hour') >= 30 then
    raise exception 'Muitas inscrições agora. Tente de novo mais tarde.';
  end if;
  return new;
end $$;

drop trigger if exists limite_bancadas_inscritos on public.bancadas_inscritos;
create trigger limite_bancadas_inscritos
  before insert on public.bancadas_inscritos
  for each row execute function public.tg_bancadas_inscritos_limite();
