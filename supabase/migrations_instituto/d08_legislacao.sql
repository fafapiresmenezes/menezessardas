-- I-04 D08: legislação e reguladores ao vivo no Instituto. Fontes públicas sem chave, lidas 1x/dia por pg_net.
create table if not exists instituto.legis_fontes(
  id smallint primary key, nome text not null, orgao text not null, url text not null, pagina text not null, por_que text not null);
create table if not exists instituto.legis_leituras(
  id bigserial primary key, fonte smallint not null references instituto.legis_fontes(id), pedido bigint, quando timestamptz not null default now(),
  status int, bytes int, sha256 text, ok boolean, mudou boolean, lido_em timestamptz);
create index if not exists legis_leituras_fonte on instituto.legis_leituras(fonte, quando desc);
alter table instituto.legis_fontes enable row level security; alter table instituto.legis_leituras enable row level security;
revoke all on instituto.legis_fontes, instituto.legis_leituras from anon, authenticated;

insert into instituto.legis_fontes values
 (1,'Lei do Inquilinato (Lei 8.245/91) e alterações','LexML / Senado','https://www.lexml.gov.br/urn/urn:lex:br:federal:lei:1991-10-18;8245','https://www.lexml.gov.br/urn/urn:lex:br:federal:lei:1991-10-18;8245','Texto da lei e de cada lei que a alterou'),
 (2,'Diário Oficial da União, seção 1','Imprensa Nacional','https://www.in.gov.br/leiturajornal?secao=do1','https://www.in.gov.br/leiturajornal?secao=do1','Onde sai toda lei, decreto e norma federal nova'),
 (3,'Precedentes qualificados e temas repetitivos','STJ','https://processo.stj.jus.br/repetitivos/temas_repetitivos/','https://processo.stj.jus.br/repetitivos/temas_repetitivos/','Teses que os tribunais devem seguir em locação'),
 (4,'Projetos de lei sobre locação','Câmara dos Deputados (dados abertos)','https://dadosabertos.camara.leg.br/api/v2/proposicoes?keywords=loca%C3%A7%C3%A3o&ordem=DESC&ordenarPor=id&itens=20','https://www.camara.leg.br/busca-portal?contextoBusca=BuscaProposicoes&q=loca%C3%A7%C3%A3o','Mudanças na lei antes de virarem lei'),
 (5,'IGP-M mensal (reajuste de aluguel)','Banco Central (SGS 189)','https://api.bcb.gov.br/dados/serie/bcdata.sgs.189/dados/ultimos/12?formato=json','https://www3.bcb.gov.br/sgspub/','Índice usado na maioria dos contratos de locação'),
 (6,'Notícias e normas de proteção de dados','ANPD','https://www.gov.br/anpd/pt-br/assuntos/noticias','https://www.gov.br/anpd/pt-br/assuntos/noticias','Regras de LGPD e o sandbox de IA da ANPD'),
 (7,'Notícias e sandbox do mercado de capitais','CVM','https://www.gov.br/cvm/pt-br/assuntos/noticias','https://www.gov.br/cvm/pt-br/assuntos/noticias','Sandbox regulatório e fundos imobiliários')
on conflict (id) do update set nome=excluded.nome, orgao=excluded.orgao, url=excluded.url, pagina=excluded.pagina, por_que=excluded.por_que;

create or replace function instituto.legis_disparar()
returns void language plpgsql security definer set search_path to 'instituto','public','extensions','pg_temp' as $$
declare f record;
begin
  for f in select * from instituto.legis_fontes order by id loop
    insert into instituto.legis_leituras(fonte, pedido) values (f.id, net.http_get(f.url, timeout_milliseconds := 45000));
  end loop;
end $$;

create or replace function instituto.legis_ler()
returns int language plpgsql security definer set search_path to 'instituto','public','extensions','pg_temp' as $$
declare l record; r record; txt text; h text; ant text; n int := 0;
begin
  for l in select * from instituto.legis_leituras where lido_em is null and pedido is not null order by id loop
    select * into r from net._http_response where id = l.pedido;
    if not found then
      if l.quando < now() - interval '30 minutes' then update instituto.legis_leituras set ok=false, lido_em=now() where id=l.id; end if;
      continue;
    end if;
    -- Postgres decide a gula da expressão inteira pelo 1º quantificador: começar com .*? mantém tudo não guloso.
    txt := regexp_replace(coalesce(r.content,''), '<script.*?</script>', ' ', 'gi');
    txt := regexp_replace(txt, '<style.*?</style>', ' ', 'gi');
    txt := regexp_replace(txt, '<noscript.*?</noscript>', ' ', 'gi');
    txt := regexp_replace(txt, '<[^>]+>', ' ', 'g');
    txt := btrim(regexp_replace(txt, '\s+', ' ', 'g'));
    if r.status_code between 200 and 299 and length(txt) >= 100 then
      h := encode(extensions.digest(txt, 'sha256'), 'hex');
      select sha256 into ant from instituto.legis_leituras where fonte=l.fonte and ok and id<l.id order by id desc limit 1;
      update instituto.legis_leituras set status=r.status_code, bytes=length(r.content), sha256=h, ok=true, mudou=(ant is not null and ant<>h), lido_em=now() where id=l.id;
    else
      update instituto.legis_leituras set status=r.status_code, bytes=length(r.content), ok=false, lido_em=now() where id=l.id;
    end if;
    n := n + 1;
  end loop;
  return n;
end $$;

create or replace function public.instituto_legislacao()
returns jsonb language sql stable security definer set search_path to 'instituto','public','pg_temp' as $$
  select jsonb_build_object('fontes', coalesce(jsonb_agg(x order by x->>'id'),'[]'::jsonb), 'atualizado_em', now()) from (
    select jsonb_build_object('id', lpad(f.id::text,2,'0'), 'nome', f.nome, 'orgao', f.orgao, 'pagina', f.pagina, 'por_que', f.por_que,
      'ultima_leitura', (select max(lido_em) from instituto.legis_leituras where fonte=f.id and ok),
      'ultima_ok', (select ok from instituto.legis_leituras where fonte=f.id and lido_em is not null order by id desc limit 1),
      'ultima_mudanca', (select max(lido_em) from instituto.legis_leituras where fonte=f.id and mudou),
      'primeira_leitura', (select min(lido_em) from instituto.legis_leituras where fonte=f.id and ok),
      'leituras_7d', (select count(*) from instituto.legis_leituras where fonte=f.id and lido_em > now()-interval '7 days'),
      'falhas_7d', (select count(*) from instituto.legis_leituras where fonte=f.id and lido_em > now()-interval '7 days' and not ok),
      'sha256', (select sha256 from instituto.legis_leituras where fonte=f.id and ok order by id desc limit 1)) x
    from instituto.legis_fontes f) s
$$;
grant execute on function public.instituto_legislacao() to anon, authenticated;
revoke execute on function instituto.legis_disparar() from public, anon, authenticated;
revoke execute on function instituto.legis_ler() from public, anon, authenticated;

select cron.schedule('instituto-legis-disparar','10 9 * * *', $$select instituto.legis_disparar()$$);
select cron.schedule('instituto-legis-ler','25 9 * * *', $$select instituto.legis_ler()$$);
