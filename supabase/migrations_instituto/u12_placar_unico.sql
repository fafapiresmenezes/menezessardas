-- U12 · Placar único: protocolos do PC (motor THE EYE) e do Instituto (I-10, I-11) com a mesma régua.
-- Régua: Brier do modelo, Brier da melhor linha de base, BSS = 1 − modelo/base, diferença e IC 95%, veredito. Selo OTS por protocolo.
create table if not exists instituto.placar_selos (
  id text primary key, sha256 text not null, prova_b64 text, selado_em timestamptz not null default now());
alter table instituto.placar_selos enable row level security;

create or replace function instituto.placar_linhas() returns table (id text, j jsonb) language sql stable set search_path = '' as $$
  select p.id, jsonb_build_object('id', p.id, 'dominio', 'geral (motor THE EYE)', 'titulo', p.titulo, 'n', p.dados->'n',
    'brier_modelo', coalesce(p.dados->'brier_modelo', p.dados->'brier_motor'),
    'brier_base', coalesce(p.dados->'brier_persistencia', p.dados->'brier_naive'),
    'base', case when p.dados ? 'brier_persistencia' then 'persistência (melhor base)' when p.dados ? 'brier_naive' then 'naive' end,
    'dif', p.dados->'dif_vs_melhor_baseline', 'ic95', p.dados->'ic95_dif_vs_melhor_baseline',
    'resolvidas', p.dados->'resolvidas', 'veredito', p.veredito, 'origem', p.origem)
  from instituto.placar_protocolos p
  union all
  select 'I-10', jsonb_build_object('id','I-10','dominio','jurídico (locação)','titulo','Grafo x convencional, 1ª rodada (DataJud, 3 tribunais)',
    'n', c.resultado->'teste', 'brier_modelo', c.resultado->'brier_grafo', 'brier_base', c.resultado->'brier_convencional',
    'base','convencional (taxa por tribunal e classe)', 'dif', c.resultado->'dif_grafo_menos_conv', 'ic95', c.resultado->'ic95',
    'veredito', c.resultado->>'veredito', 'origem','Instituto THEYE, pré-registro I-10')
  from (select * from instituto.comparacoes order by id desc limit 1) c
  union all
  select 'I-11', jsonb_build_object('id','I-11','dominio','jurídico (locação)','titulo','Grafo de normas x convencional (DataJud, 6 tribunais)',
    'n', r.resultado->'teste', 'brier_modelo', r.resultado->'C'->'brier', 'brier_base', r.resultado->'B'->'brier',
    'base','convencional (regressão com variáveis do processo)', 'dif', r.resultado->'dif_brier_c_menos_b', 'ic95', r.resultado->'ic95'->'c_menos_b',
    'ece', r.resultado->'C'->'ece', 'veredito', r.resultado->>'veredito', 'origem','Instituto THEYE, pré-registro I-11 (selado 19:46Z)')
  from (select * from instituto.i11_rodadas order by id desc limit 1) r $$;

create or replace function public.instituto_placar_unico() returns jsonb language sql security definer set search_path = '' stable as $$
  select coalesce(jsonb_agg(l.j || jsonb_build_object(
      'bss', case when (l.j->>'brier_base')::numeric > 0 then round(1 - (l.j->>'brier_modelo')::numeric/(l.j->>'brier_base')::numeric, 4) end,
      'selo_sha256', s.sha256, 'selado_em', s.selado_em, 'selo_ots', s.prova_b64 is not null) order by l.id), '[]'::jsonb)
  from instituto.placar_linhas() l left join instituto.placar_selos s on s.id = l.id $$;
grant execute on function public.instituto_placar_unico() to anon, authenticated;
