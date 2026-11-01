-- Plano I-03, passo C08: registro de incidentes dos agentes ("relatar resposta errada").
-- Não guarda pergunta, e-mail nem IP: só agente, motivo, comentário curto e trecho da resposta.
create table if not exists instituto.agentes_incidentes (
  id bigint generated always as identity primary key,
  criado_em timestamptz not null default now(),
  agente text not null,
  motivo text not null check (motivo in ('errada','desatualizada','sem_fonte','ofensiva','outro')),
  comentario text check (char_length(comentario) <= 500),
  resposta_trecho text check (char_length(resposta_trecho) <= 1500),
  resposta_sha256 text,
  status text not null default 'aberto' check (status in ('aberto','procedente','improcedente','corrigido')),
  revisado_em timestamptz,
  nota_revisao text
);
alter table instituto.agentes_incidentes enable row level security;

create or replace function public.instituto_relatar_incidente(p_agente text, p_motivo text, p_comentario text, p_resposta text)
returns jsonb language plpgsql security definer set search_path = instituto, public as $$
declare novo bigint;
begin
  if not exists (select 1 from agentes where id = p_agente) then return jsonb_build_object('erro','Agente desconhecido.'); end if;
  if p_motivo not in ('errada','desatualizada','sem_fonte','ofensiva','outro') then return jsonb_build_object('erro','Motivo inválido.'); end if;
  if (select count(*) from agentes_incidentes where criado_em > now() - interval '1 day') >= 200 then
    return jsonb_build_object('erro','Limite diário de relatos atingido. Tente amanhã.'); end if;
  insert into agentes_incidentes(agente, motivo, comentario, resposta_trecho, resposta_sha256)
  values (p_agente, p_motivo, left(nullif(trim(p_comentario),''), 500), left(p_resposta, 1500),
          encode(extensions.digest(coalesce(p_resposta,''), 'sha256'), 'hex'))
  returning id into novo;
  return jsonb_build_object('ok', true, 'protocolo', 'INC-' || lpad(novo::text, 5, '0'));
end $$;
revoke all on function public.instituto_relatar_incidente(text, text, text, text) from public;
grant execute on function public.instituto_relatar_incidente(text, text, text, text) to anon, authenticated;

-- Contagem pública agregada (transparência, sem conteúdo).
create or replace function public.instituto_incidentes_resumo() returns jsonb language sql stable security definer set search_path = instituto, public as $$
  select jsonb_build_object('total', count(*), 'abertos', count(*) filter (where status = 'aberto'),
    'corrigidos', count(*) filter (where status = 'corrigido')) from agentes_incidentes
$$;
grant execute on function public.instituto_incidentes_resumo() to anon, authenticated;
