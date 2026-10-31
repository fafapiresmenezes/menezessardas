-- Plano I-02, passo U15: 50 agentes do Instituto acionados por botão (Claude), em 5 lotes de 10.
create table if not exists instituto.agentes (
  id text primary key, lote int not null, ordem int not null, nome text not null, area text not null,
  formacao text not null, papel text not null, botao text not null, ativo boolean not null default true
);
alter table instituto.agentes enable row level security;
-- Uso agregado por dia e agente (sem guardar perguntas nem quem perguntou).
create table if not exists instituto.agentes_uso (
  dia date not null, agente text not null, chamadas int not null default 0,
  tokens_entrada int not null default 0, tokens_saida int not null default 0, custo_usd numeric not null default 0,
  primary key (dia, agente)
);
alter table instituto.agentes_uso enable row level security;
-- Limite diário por pessoa (só o id interno do membro e a contagem).
create table if not exists instituto.agentes_cota (membro uuid not null, dia date not null, n int not null default 0, primary key (membro, dia));
alter table instituto.agentes_cota enable row level security;

create or replace function public.instituto_agentes_lista() returns jsonb language sql stable security definer set search_path = instituto, public as $$
  select coalesce(jsonb_agg(jsonb_build_object('id',id,'lote',lote,'nome',nome,'area',area,'formacao',formacao,'papel',papel,'botao',botao) order by ordem), '[]') from agentes where ativo
$$;
grant execute on function public.instituto_agentes_lista() to anon, authenticated;

create or replace function public.instituto_agentes_custo() returns jsonb language sql stable security definer set search_path = instituto, public as $$
  select jsonb_build_object('chamadas', coalesce(sum(chamadas),0), 'custo_usd', coalesce(sum(custo_usd),0),
    'custo_medio_usd', case when sum(chamadas) > 0 then round(sum(custo_usd)/sum(chamadas), 6) end,
    'tokens_medios', case when sum(chamadas) > 0 then round((sum(tokens_entrada)+sum(tokens_saida))::numeric/sum(chamadas)) end)
  from agentes_uso
$$;
grant execute on function public.instituto_agentes_custo() to anon, authenticated;

-- Reserva uma chamada: confere cota da pessoa (3/dia grátis, 20/dia membro) e teto global (300/dia).
create or replace function public.instituto_agente_reservar(p_membro uuid, p_membro_pleno boolean) returns text
language plpgsql security definer set search_path = instituto, public as $$
declare n int; tot int; lim int := 3;
begin
  select coalesce(sum(chamadas),0) into tot from agentes_uso where dia = current_date;
  if tot >= 300 then return 'teto'; end if;
  insert into agentes_cota(membro, dia, n) values (p_membro, current_date, 1)
    on conflict (membro, dia) do update set n = agentes_cota.n + 1 returning agentes_cota.n into n;
  if p_membro_pleno then lim := 20; end if;
  if n > lim then return 'cota'; end if;
  return 'ok';
end $$;
revoke all on function public.instituto_agente_reservar(uuid, boolean) from public, anon, authenticated;
grant execute on function public.instituto_agente_reservar(uuid, boolean) to service_role;

create or replace function public.instituto_agente_registrar(p_agente text, p_in int, p_out int, p_usd numeric) returns void
language sql security definer set search_path = instituto, public as $$
  insert into agentes_uso(dia, agente, chamadas, tokens_entrada, tokens_saida, custo_usd) values (current_date, p_agente, 1, p_in, p_out, p_usd)
  on conflict (dia, agente) do update set chamadas = agentes_uso.chamadas + 1, tokens_entrada = agentes_uso.tokens_entrada + p_in,
    tokens_saida = agentes_uso.tokens_saida + p_out, custo_usd = agentes_uso.custo_usd + p_usd
$$;
revoke all on function public.instituto_agente_registrar(text, int, int, numeric) from public, anon, authenticated;
grant execute on function public.instituto_agente_registrar(text, int, int, numeric) to service_role;

create or replace function public.instituto_agente_def(p_id text) returns jsonb language sql stable security definer set search_path = instituto, public as $$
  select to_jsonb(a) from agentes a where id = p_id and ativo
$$;
revoke all on function public.instituto_agente_def(text) from public, anon, authenticated;
grant execute on function public.instituto_agente_def(text) to service_role;
