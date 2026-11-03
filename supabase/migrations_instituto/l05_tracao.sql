-- Passo L05 (I-04): tração por canal, só contagens agregadas por dia, origem e evento (sem cookie, sem IP, sem e-mail).
create table if not exists instituto.tracao (
  dia date not null default current_date,
  origem text not null,
  evento text not null check (evento in ('visita','cadastro','chave_api','contrato','relatorio')),
  n int not null default 0,
  primary key (dia, origem, evento)
);
alter table instituto.tracao enable row level security;

-- Gasto declarado por canal (mídia paga, impulsionamento). Hoje zero: os 3 canais do lançamento são orgânicos.
create table if not exists instituto.tracao_gasto (
  origem text primary key,
  gasto_brl numeric not null default 0,
  nota text
);
alter table instituto.tracao_gasto enable row level security;
insert into instituto.tracao_gasto(origem, nota) values
  ('linkedin','publicação orgânica no perfil de M e do Instituto'),
  ('oab-jovem','comissões de jovens advogados da OAB, convite orgânico'),
  ('grupos-imobiliarias','grupos de imobiliárias e administradoras, convite orgânico')
on conflict (origem) do nothing;

create or replace function public.instituto_tracao_evento(p_origem text, p_evento text)
returns void language plpgsql security definer set search_path = instituto, public as $$
declare o text := lower(coalesce(nullif(trim(p_origem),''),'direto'));
begin
  if o !~ '^[a-z0-9-]{2,40}$' then o := 'outro'; end if;
  if p_evento not in ('visita','cadastro','chave_api','contrato','relatorio') then return; end if;
  if (select coalesce(sum(n),0) from tracao where dia = current_date) >= 20000 then return; end if;
  insert into tracao(dia, origem, evento, n) values (current_date, o, p_evento, 1)
    on conflict (dia, origem, evento) do update set n = tracao.n + 1;
end $$;
revoke all on function public.instituto_tracao_evento(text,text) from public;
grant execute on function public.instituto_tracao_evento(text,text) to anon, authenticated, service_role;

-- Resumo para /negocio.html e OKR: por canal, visitas, cadastros, conversão e custo por cadastro (gasto do canal + IA rateada).
create or replace function public.instituto_tracao_resumo(p_dias int default 30)
returns jsonb language sql stable security definer set search_path = instituto, public as $$
  with t as (select origem, sum(n) filter (where evento='visita') v, sum(n) filter (where evento='cadastro') c,
                    sum(n) filter (where evento='chave_api') k, sum(n) filter (where evento='contrato') ct, sum(n) filter (where evento='relatorio') r
               from tracao where dia > current_date - greatest(1, least(coalesce(p_dias,30), 365)) group by origem),
  ia as (select coalesce(sum(custo_usd),0) * 5.42 brl from agentes_uso where dia > current_date - greatest(1, least(coalesce(p_dias,30), 365))),
  tot as (select coalesce(sum(c),0) c from t)
  select jsonb_build_object(
    'janela_dias', greatest(1, least(coalesce(p_dias,30), 365)),
    'membros_confirmados', (select count(*) from membros where confirmado_em is not null),
    'pagantes', (select count(distinct membro_id) from pagamentos where not estornado),
    'custo_ia_brl', round((select brl from ia)::numeric, 2),
    'canais', coalesce((select jsonb_agg(jsonb_build_object('origem', t.origem, 'visitas', coalesce(v,0), 'cadastros', coalesce(c,0),
        'conversao', case when coalesce(v,0) > 0 then round(coalesce(c,0)::numeric / v, 4) end,
        'chaves_api', coalesce(k,0), 'contratos_lidos', coalesce(ct,0), 'relatorios', coalesce(r,0),
        'gasto_brl', coalesce(g.gasto_brl,0),
        'custo_por_cadastro_brl', case when coalesce(c,0) > 0 then round((coalesce(g.gasto_brl,0) + (select brl from ia) * c / nullif((select c from tot),0))::numeric / c, 2) end)
        order by coalesce(c,0) desc, coalesce(v,0) desc) from t left join tracao_gasto g using (origem)), '[]'),
    'nota', 'Contagens agregadas por dia, canal e evento; sem cookie, IP ou e-mail. Custo por cadastro = gasto declarado do canal + custo de IA da janela rateado pelos cadastros. Conversão = cadastros / visitas da mesma origem.');
$$;
revoke all on function public.instituto_tracao_resumo(int) from public;
grant execute on function public.instituto_tracao_resumo(int) to anon, authenticated, service_role;
