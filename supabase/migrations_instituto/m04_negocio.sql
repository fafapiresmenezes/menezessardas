-- Passo M04 (I-04): painel de 30 dias do negócio do Instituto (só agregados, LGPD).
create table if not exists instituto.pagamentos (
  id bigint generated always as identity primary key,
  membro_id uuid references instituto.membros(id) on delete set null,
  tipo text not null check (tipo in ('membro_mensal','avulsa')),
  valor_centavos integer not null check (valor_centavos > 0),
  processador text not null default 'stripe',
  referencia_hash text unique,          -- sha256 do id do processador; nunca o id em claro
  pago_em timestamptz not null default now(),
  estornado boolean not null default false
);
alter table instituto.pagamentos enable row level security;
revoke all on instituto.pagamentos from anon, authenticated;

create table if not exists instituto.negocio_selos (
  dia date primary key, resumo jsonb not null, sha256 text not null, pedido bigint, criado_em timestamptz default now()
);
alter table instituto.negocio_selos enable row level security;
revoke all on instituto.negocio_selos from anon, authenticated;

-- Câmbio e custo por consulta do Passo 17 (PTAX 5,4212; consulta R$ 0,98). Meta de equilíbrio: 7 membros.
create or replace function public.instituto_negocio(p_dias int default 30)
returns jsonb language sql stable security definer set search_path = '' as $$
  with j as (select greatest(1, least(coalesce(p_dias,30), 90)) n),
  dias as (select generate_series(current_date - ((select n from j) - 1), current_date, '1 day')::date d),
  cad as (select (criado_em at time zone 'America/Sao_Paulo')::date d, count(*) n from instituto.membros group by 1),
  pag as (select (pago_em at time zone 'America/Sao_Paulo')::date d, sum(valor_centavos) filter (where not estornado) c from instituto.pagamentos group by 1),
  ia as (select dia d, sum(custo_usd) usd from instituto.agentes_uso group by 1),
  con as (select (criado_em at time zone 'America/Sao_Paulo')::date d, count(*) n from instituto.consultas group by 1),
  serie as (select dias.d, coalesce(cad.n,0) cadastros, coalesce(pag.c,0)/100.0 receita,
      round(coalesce(ia.usd,0)*5.4212 + coalesce(con.n,0)*0.98, 2) custo_ia
    from dias left join cad using(d) left join pag using(d) left join ia using(d) left join con using(d)),
  tot as (select count(*) total, count(*) filter (where plano = 'membro' and coalesce(membro_ate, now()) >= now()) pagantes from instituto.membros)
  select jsonb_build_object(
    'dias', (select n from j), 'atualizado_em', now(), 'meta_equilibrio_membros', 7, 'preco_membro', 79, 'preco_avulsa', 3.94,
    'cadastros_total', tot.total, 'cadastros_periodo', (select sum(cadastros) from serie),
    'pagantes', tot.pagantes, 'conversao_pct', case when tot.total > 0 then round(100.0 * tot.pagantes / tot.total, 1) else 0 end,
    'receita_periodo', (select sum(receita) from serie), 'custo_ia_periodo', (select sum(custo_ia) from serie),
    'custo_ia_por_membro', case when tot.total > 0 then round((select sum(custo_ia) from serie) / tot.total, 2) else 0 end,
    'margem_periodo', (select sum(receita) - sum(custo_ia) from serie),
    'cobranca_ativa', exists (select 1 from instituto.pagamentos),
    'serie', (select jsonb_agg(jsonb_build_object('dia', d, 'cadastros', cadastros, 'receita', receita, 'custo_ia', custo_ia) order by d) from serie))
  from tot $$;
revoke all on function public.instituto_negocio(int) from public;
grant execute on function public.instituto_negocio(int) to anon, authenticated;

-- Selo diário: guarda o resumo do dia com sha256 e pede o carimbo OpenTimestamps.
create or replace function instituto.selar_negocio() returns void language plpgsql security definer
set search_path = instituto, public, extensions, pg_temp as $$
declare r jsonb := public.instituto_negocio(30) - 'atualizado_em'; h text := encode(extensions.digest(r::text, 'sha256'), 'hex'); p bigint;
begin
  select net.http_post('https://hlraekzvgxdpiiigdxdo.supabase.co/functions/v1/ancorar-hash', jsonb_build_object('digest', h), '{}'::jsonb,
    jsonb_build_object('Content-Type','application/json','Authorization','Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhscmFla3p2Z3hkcGlpaWdkeGRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI4ODEzOTksImV4cCI6MjEwODQ1NzM5OX0.yCNPEGDb7tdf1JIY30WKUbE-xZwjQFwygJFJnvBeyrs','x-cron-secret',(select valor from public.configuracoes where chave='cron_segredo')), 60000) into p;
  insert into instituto.negocio_selos(dia, resumo, sha256, pedido) values (current_date, r, h, p)
  on conflict (dia) do update set resumo = excluded.resumo, sha256 = excluded.sha256, pedido = excluded.pedido, criado_em = now();
end $$;
revoke all on function instituto.selar_negocio() from public, anon, authenticated;
select cron.schedule('instituto-negocio-selo', '55 2 * * *', 'select instituto.selar_negocio()');
