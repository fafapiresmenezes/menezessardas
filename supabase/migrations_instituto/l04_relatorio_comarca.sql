-- Passo L04 (I-04): relatório jurimétrico de ações de locação por comarca, com selo no Bitcoin.
-- Só agregados públicos do DataJud. Regra de amostra: com menos de 10 julgamentos de mérito a taxa não aparece;
-- de 10 a 29 aparece com aviso de amostra pequena; sempre com intervalo de 95% (Wilson).

create or replace function instituto.comarca_de(p_tribunal text, p_orgao text) returns text language sql immutable as $$
  select case when p_tribunal = 'TJSP' and instituto.chave_comarca(c) ~ '^(central|santana|santo amaro|jabaquara|lapa|sao miguel paulista|penha de franca|itaquera|tatuape|vila prudente|nossa senhora do o|pinheiros|ipiranga|butanta|parelheiros)$' then 'São Paulo'
    when c ~* '^capital$' then case p_tribunal when 'TJRJ' then 'Rio De Janeiro' when 'TJSP' then 'São Paulo' when 'TJMG' then 'Belo Horizonte'
    when 'TJRS' then 'Porto Alegre' when 'TJPR' then 'Curitiba' else c end else c end
  from (select nullif(trim(initcap(lower(regexp_replace(coalesce(
    case when p_tribunal = 'TJDFT' then 'Distrito Federal' end,
    substring(p_orgao from '(?i)comarca d[eoa]s? (.+?)(\s*-.*)?$'),
    case when p_orgao ~* '(foro central|regional)' and p_tribunal = 'TJSP' then 'São Paulo'
         when p_orgao ~* '(foro central|regional)' and p_tribunal = 'TJRJ' then 'Rio de Janeiro' end,
    case when p_tribunal = 'TJRS' and p_orgao ~ ' - ' then regexp_replace(substring(p_orgao from '.* - (.+)$'), '\s*\[.*\]', '') end,
    case when p_tribunal = 'TJPR' then substring(p_orgao from '^([A-ZÇÃÕÁÉÍÓÚÂÊÔ ]{3,}?) - ') end,
    substring(p_orgao from '(?i)^\d+\s+(?:civel|cumulativa|vara|fazenda publica|juizado especial civel|jec)\s+d[eoa]s?\s+(.+)$'),
    substring(p_orgao from '(?i)^vara unica d[eoa]s? (.+)$'),
    substring(p_orgao from '^([A-ZÇÃÕÁÉÍÓÚÂÊÔ ]+?)\s+(?:\d+|VARA|JUI|REGIONAL|CENTRAL|J ESP|PRE PROC)'),
    substring(p_orgao from '(?i)\s(?:de|do|da)\s([A-ZÁÉÍÓÚÂÊÔÃÕÇ][A-Za-zÀ-ÿ'' ]+)$')
  ), '\s+', ' ', 'g')))), '') c) x
$$;

-- Chave sem acento e sem caixa, para juntar "Américo" e "Americo".
create or replace function instituto.chave_comarca(t text) returns text language sql immutable as $$
  select lower(translate(coalesce(t,''), 'ÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇáàâãäéèêëíìîïóòôõöúùûüç', 'AAAAAEEEEIIIIOOOOOUUUUCaaaaaeeeeiiiiooooouuuuc'))
$$;

create table if not exists instituto.relatorios_comarca (
  sha256 text primary key,
  tribunal text not null,
  comarca text not null,
  dia date not null default current_date,
  resumo jsonb not null,
  pedido bigint,
  prova_b64 text,
  criado_em timestamptz not null default now()
);
alter table instituto.relatorios_comarca enable row level security;

create or replace function public.instituto_comarcas(p_tribunal text)
returns jsonb language sql stable security definer set search_path = instituto, public as $$
  with c as (select instituto.comarca_de(tribunal, orgao) com, desfecho from processos where tribunal = upper(p_tribunal)),
  k as (select instituto.chave_comarca(com) chave, com, count(*) n, count(*) filter (where desfecho in ('procedencia','parcial','improcedencia')) m
        from c where com is not null group by 1, 2),
  g as (select chave, (array_agg(com order by n desc))[1] nome, sum(n) n, sum(m) m from k group by chave)
  select coalesce(jsonb_agg(jsonb_build_object('chave', chave, 'nome', nome, 'acoes', n, 'merito', m) order by n desc), '[]') from g;
$$;
revoke all on function public.instituto_comarcas(text) from public;
grant execute on function public.instituto_comarcas(text) to anon, authenticated, service_role;

-- Métricas de um conjunto: volume, taxa com IC 95% de Wilson, tempo mediano em dias.
create or replace function instituto.metricas_locacao(p_tribunal text, p_chave text)
returns jsonb language sql stable security definer set search_path = instituto, public as $$
  with m as (
    select classe, desfecho, case when data_desfecho >= data_ajuizamento then data_desfecho - data_ajuizamento end dias
      from processos where tribunal = upper(p_tribunal) and (p_chave is null or instituto.chave_comarca(instituto.comarca_de(tribunal, orgao)) = p_chave)),
  a as (select count(*) v, count(*) filter (where desfecho in ('procedencia','parcial'))::float8 k,
               count(*) filter (where desfecho in ('procedencia','parcial','improcedencia')) n,
               percentile_cont(0.5) within group (order by dias) filter (where dias is not null and desfecho is not null) med,
               count(dias) filter (where desfecho is not null) nt from m),
  w as (select *, case when n > 0 then k / n end p from a),
  ic as (select *, case when n > 0 then (p + 1.96^2/(2*n) - 1.96*sqrt(p*(1-p)/n + 1.96^2/(4*n*n))) / (1 + 1.96^2/n) end wl,
                   case when n > 0 then (p + 1.96^2/(2*n) + 1.96*sqrt(p*(1-p)/n + 1.96^2/(4*n*n))) / (1 + 1.96^2/n) end wh from w)
  select jsonb_build_object('acoes', v,
    'por_classe', (select coalesce(jsonb_agg(jsonb_build_object('classe', classe, 'acoes', c) order by c desc), '[]') from (select classe, count(*) c from m group by 1) x),
    'merito', n,
    'procedencia', case when n >= 10 then jsonb_build_object('p', round(p::numeric, 3), 'ic95', jsonb_build_array(round(wl::numeric, 3), round(wh::numeric, 3)), 'n', n) end,
    'amostra', case when n < 10 then 'insuficiente' when n < 30 then 'pequena' else 'adequada' end,
    'tempo_mediano_dias', case when nt >= 10 then round(med::numeric) end, 'n_tempo', nt)
  from ic;
$$;

create or replace function public.instituto_relatorio_comarca(p_tribunal text, p_chave text)
returns jsonb language plpgsql security definer set search_path = instituto, public, extensions as $$
declare t text := upper(coalesce(p_tribunal,'')); ch text := instituto.chave_comarca(p_chave); nome text; r jsonb; h text; ped bigint; row_ record;
begin
  if t !~ '^TJ[A-Z]{2,3}$' then return jsonb_build_object('erro','Escolha o tribunal.'); end if;
  select x->>'nome' into nome from jsonb_array_elements(public.instituto_comarcas(t)) x where x->>'chave' = ch;
  if nome is null then return jsonb_build_object('erro','Comarca sem ações de locação na base.'); end if;
  r := jsonb_build_object(
    'titulo', 'Relatório jurimétrico de locação', 'tribunal', t, 'comarca', nome, 'base_em', current_date,
    'comarca_dados', instituto.metricas_locacao(t, ch),
    'estado', instituto.metricas_locacao(t, null),
    'metodo', 'Ações de locação do DataJud (CNJ) coletadas pelo THEYE Institute. Procedência = procedente ou parcialmente procedente entre julgamentos de mérito; intervalo de 95% de Wilson. Tempo = mediana de dias entre ajuizamento e desfecho. Com menos de 10 julgamentos a taxa não é mostrada; de 10 a 29 vem com aviso.',
    'fonte', 'DataJud (CNJ), só dados agregados; nenhuma parte é identificada.');
  h := encode(digest(r::text, 'sha256'), 'hex');
  select * into row_ from relatorios_comarca where sha256 = h;
  if not found then
    if (select count(*) from relatorios_comarca where dia = current_date) < 300 then
      select net.http_post('https://hlraekzvgxdpiiigdxdo.supabase.co/functions/v1/ancorar-hash', jsonb_build_object('digest', h), '{}'::jsonb,
        jsonb_build_object('Content-Type','application/json','Authorization','Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhscmFla3p2Z3hkcGlpaWdkeGRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI4ODEzOTksImV4cCI6MjEwODQ1NzM5OX0.yCNPEGDb7tdf1JIY30WKUbE-xZwjQFwygJFJnvBeyrs','x-cron-secret',(select valor from public.configuracoes where chave='cron_segredo')), 60000) into ped;
    end if;
    insert into relatorios_comarca(sha256, tribunal, comarca, resumo, pedido) values (h, t, nome, r, ped);
  end if;
  return r || jsonb_build_object('texto_selado', r::text, 'sha256', h, 'selo', case when row_.prova_b64 is not null then 'pronto' else 'pedido enviado ao calendário OpenTimestamps' end);
end $$;
revoke all on function public.instituto_relatorio_comarca(text,text) from public;
grant execute on function public.instituto_relatorio_comarca(text,text) to anon, authenticated, service_role;

-- Prova OpenTimestamps do relatório (base64); o navegador monta o arquivo .ots.
create or replace function public.instituto_relatorio_prova(p_sha text)
returns jsonb language plpgsql security definer set search_path = instituto, public as $$
declare r record; pv text;
begin
  select * into r from relatorios_comarca where sha256 = lower(coalesce(p_sha,''));
  if not found then return jsonb_build_object('erro','Relatório não encontrado.'); end if;
  if r.prova_b64 is null and r.pedido is not null then
    select content::jsonb->>'provaB64' into pv from net._http_response where id = r.pedido and content like '{%provaB64%';
    if pv is not null then update relatorios_comarca set prova_b64 = pv where sha256 = r.sha256; end if;
  end if;
  return jsonb_build_object('sha256', r.sha256, 'prova_b64', coalesce(r.prova_b64, pv));
end $$;
revoke all on function public.instituto_relatorio_prova(text) from public;
grant execute on function public.instituto_relatorio_prova(text) to anon, authenticated, service_role;
