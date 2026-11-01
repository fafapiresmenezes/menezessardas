-- Plano I-03, passos C10/C11: medição de campo própria, sem cookies e sem identificar ninguém.
-- Guarda só dia, página, métrica e valor (LCP, INP, CLS, TTFB). Nada de IP, navegador ou id.
create table if not exists instituto.web_vitais (
  id bigint generated always as identity primary key,
  dia date not null default (now() at time zone 'America/Sao_Paulo')::date,
  pagina text not null check (char_length(pagina) <= 60),
  metrica text not null check (metrica in ('LCP','INP','CLS','TTFB')),
  valor numeric not null check (valor >= 0 and valor < 600000),
  movel boolean
);
alter table instituto.web_vitais enable row level security;
create index if not exists web_vitais_dia on instituto.web_vitais(dia);

create or replace function public.instituto_vitais(p jsonb) returns void
language plpgsql security definer set search_path = instituto, public as $$
declare k text; pag text := left(regexp_replace(coalesce(p->>'pagina','/'), '[^a-z0-9/._-]', '', 'g'), 60);
begin
  if (select count(*) from web_vitais where dia = (now() at time zone 'America/Sao_Paulo')::date) >= 20000 then return; end if;
  foreach k in array array['LCP','INP','CLS','TTFB'] loop
    if jsonb_typeof(p->k) = 'number' and (p->>k)::numeric >= 0 and (p->>k)::numeric < 600000 then
      insert into web_vitais(pagina, metrica, valor, movel) values (pag, k, (p->>k)::numeric, (p->>'movel')::boolean);
    end if;
  end loop;
end $$;
revoke all on function public.instituto_vitais(jsonb) from public;
grant execute on function public.instituto_vitais(jsonb) to anon, authenticated;

-- Painel público: percentil 75 por métrica nos últimos N dias (padrão do Core Web Vitals).
create or replace function public.instituto_vitais_resumo(p_dias int default 28) returns jsonb
language sql stable security definer set search_path = instituto, public as $$
  select jsonb_build_object('dias_com_dado', (select count(distinct dia) from web_vitais where dia > current_date - p_dias),
    'primeiro_dia', (select min(dia) from web_vitais),
    'metricas', coalesce((select jsonb_object_agg(metrica, jsonb_build_object('p75', round(p75::numeric, 3), 'n', n)) from (
      select metrica, percentile_cont(0.75) within group (order by valor) p75, count(*) n
      from web_vitais where dia > current_date - p_dias group by metrica) t), '{}'::jsonb),
    'paginas', coalesce((select jsonb_object_agg(pagina, inp) from (
      select pagina, round(percentile_cont(0.75) within group (order by valor)::numeric) inp
      from web_vitais where metrica = 'INP' and dia > current_date - p_dias group by pagina) u), '{}'::jsonb))
$$;
grant execute on function public.instituto_vitais_resumo(int) to anon, authenticated;
