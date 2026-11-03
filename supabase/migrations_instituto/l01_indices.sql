-- I-04 L01: índices de reajuste de aluguel (IGP-M 189, IPCA 433, INPC 188) do SGS/Banco Central, lidos 1x/dia.
create table if not exists instituto.indices(serie text not null, mes date not null, valor numeric not null, lido_em timestamptz not null default now(), primary key(serie, mes));
create table if not exists instituto.indices_pedidos(id bigserial primary key, serie text not null, pedido bigint not null, quando timestamptz not null default now(), lido boolean not null default false);
alter table instituto.indices enable row level security; alter table instituto.indices_pedidos enable row level security;
revoke all on instituto.indices, instituto.indices_pedidos from anon, authenticated;

create or replace function instituto.indices_disparar()
returns void language plpgsql security definer set search_path to 'instituto','public','extensions','pg_temp' as $$
declare s record; ini text := to_char(date_trunc('month', now()) - interval '48 months','DD/MM/YYYY');
begin
  -- O SGS aceita no máximo 20 em /ultimos/N; por isso pedimos por data inicial (4 anos).
  for s in select * from (values ('IGP-M',189),('IPCA',433),('INPC',188)) v(nome,cod) loop
    insert into instituto.indices_pedidos(serie, pedido)
    values (s.nome, net.http_get('https://api.bcb.gov.br/dados/serie/bcdata.sgs.'||s.cod||'/dados?formato=json&dataInicial='||ini, timeout_milliseconds := 45000));
  end loop;
end $$;

create or replace function instituto.indices_ler()
returns int language plpgsql security definer set search_path to 'instituto','public','extensions','pg_temp' as $$
declare p record; r record; n int := 0;
begin
  for p in select * from instituto.indices_pedidos where not lido order by id loop
    select * into r from net._http_response where id = p.pedido;
    if not found then continue; end if;
    if r.status_code = 200 and left(btrim(r.content),1) = '[' then
      insert into instituto.indices(serie, mes, valor)
      select p.serie, to_date(e->>'data','DD/MM/YYYY'), (e->>'valor')::numeric from jsonb_array_elements(r.content::jsonb) e
      on conflict (serie, mes) do update set valor = excluded.valor, lido_em = now();
      get diagnostics n = row_count;
    end if;
    update instituto.indices_pedidos set lido = true where id = p.id;
  end loop;
  return n;
end $$;

create or replace function public.instituto_indices(p_meses int default 36)
returns jsonb language sql stable security definer set search_path to 'instituto','public','pg_temp' as $$
  select jsonb_build_object('fonte','Banco Central do Brasil, SGS (IGP-M 189, IPCA 433, INPC 188)',
    'series', coalesce((select jsonb_object_agg(serie, pts) from (
       select serie, jsonb_agg(jsonb_build_object('mes', to_char(mes,'YYYY-MM'), 'valor', valor) order by mes) pts
       from (select * from instituto.indices where mes >= (date_trunc('month', now()) - make_interval(months => least(greatest(p_meses,13),60)))::date) i
       group by serie) x), '{}'::jsonb),
    'lido_em', (select max(lido_em) from instituto.indices))
$$;
grant execute on function public.instituto_indices(int) to anon, authenticated;
revoke execute on function instituto.indices_disparar() from public, anon, authenticated;
revoke execute on function instituto.indices_ler() from public, anon, authenticated;
select cron.schedule('instituto-indices-disparar','12 9 * * *', $$select instituto.indices_disparar()$$);
select cron.schedule('instituto-indices-ler','27 9 * * *', $$select instituto.indices_ler()$$);
