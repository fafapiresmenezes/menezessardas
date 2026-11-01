-- Plano I-03, passo C09: amostra semanal de até 20 respostas dos agentes para revisão humana registrada.
-- Guarda só a resposta da IA (nunca a pergunta nem quem perguntou). Sorteio de 50% até fechar 20 na semana ISO.
create table if not exists instituto.agentes_amostra (
  id bigint generated always as identity primary key,
  criado_em timestamptz not null default now(),
  semana text not null,
  agente text not null,
  modelo text,
  resposta text not null check (char_length(resposta) <= 4000),
  resposta_sha256 text not null,
  veredito text check (veredito in ('correta','parcial','errada')),
  nota_revisao text check (char_length(nota_revisao) <= 1000),
  revisor text,
  revisado_em timestamptz
);
alter table instituto.agentes_amostra enable row level security;
create index if not exists agentes_amostra_semana on instituto.agentes_amostra(semana);

create or replace function public.instituto_agente_amostrar(p_agente text, p_modelo text, p_resposta text) returns boolean
language plpgsql security definer set search_path = instituto, public as $$
declare sem text := to_char(now() at time zone 'America/Sao_Paulo', 'IYYY-"W"IW');
begin
  if random() >= 0.5 then return false; end if;
  if (select count(*) from agentes_amostra where semana = sem) >= 20 then return false; end if;
  insert into agentes_amostra(semana, agente, modelo, resposta, resposta_sha256)
  values (sem, p_agente, p_modelo, left(p_resposta, 4000), encode(extensions.digest(p_resposta, 'sha256'), 'hex'));
  return true;
end $$;
revoke all on function public.instituto_agente_amostrar(text, text, text) from public, anon, authenticated;
grant execute on function public.instituto_agente_amostrar(text, text, text) to service_role;

-- Resumo público agregado da revisão (transparência no cartão do modelo).
create or replace function public.instituto_revisao_resumo() returns jsonb language sql stable security definer set search_path = instituto, public as $$
  select jsonb_build_object('amostradas', count(*), 'revisadas', count(veredito),
    'corretas', count(*) filter (where veredito='correta'), 'parciais', count(*) filter (where veredito='parcial'),
    'erradas', count(*) filter (where veredito='errada'), 'semanas', count(distinct semana)) from agentes_amostra
$$;
grant execute on function public.instituto_revisao_resumo() to anon, authenticated;
