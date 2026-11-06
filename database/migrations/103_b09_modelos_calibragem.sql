-- Bloco B09 (06/11/2026): versões da recalibração semanal. Só agregados (blocos de probabilidade), sem dado pessoal.
create table if not exists public.modelos_calibragem (
  id bigint generated always as identity primary key,
  alvo text not null check (alvo in ('inadimplencia','renovacao')),
  metodo text not null,
  blocos jsonb not null,
  n_treino int not null, n_teste int not null,
  brier_teste double precision not null, ece_teste double precision not null,
  brier_bruto double precision not null, ece_bruto double precision not null,
  ativo boolean not null default false,
  sha256 text not null check (sha256 ~ '^[0-9a-f]{64}$'),
  criado_em timestamptz not null default now()
);
create unique index if not exists modelos_calibragem_um_ativo on public.modelos_calibragem (alvo) where ativo;
alter table public.modelos_calibragem enable row level security;
create policy modelos_calibragem_select on public.modelos_calibragem for select to authenticated using (perfil_atual() is not null);
revoke all on public.modelos_calibragem from anon;
-- Agendamento (segunda, 06:40 UTC), no mesmo padrão dos outros robôs: net.http_post com x-cron-secret.
