-- I-04 D06: 3 objetivos e 9 resultados-chave do Instituto, ao vivo, com selo diário (OpenTimestamps)
create table if not exists instituto.okr_selos(
  dia date primary key, resumo jsonb not null, sha256 text not null, pedido bigint, prova_b64 text, criado_em timestamptz not null default now());
alter table instituto.okr_selos enable row level security;
revoke all on instituto.okr_selos from anon, authenticated;

create or replace function instituto.okr_calcular()
returns jsonb language plpgsql stable security definer set search_path to 'instituto','public','extensions','pg_temp' as $$
declare
  cmp jsonb := (select resultado from instituto.comparacoes order by criado_em desc limit 1);
  cs jsonb := public.instituto_coleta_sucesso(30);
  ng jsonb := public.instituto_negocio(30);
  ag jsonb := public.instituto_agentes_custo();
  sl jsonb := public.instituto_slo(30);
  inc jsonb := public.instituto_incidentes_resumo();
  dif numeric := (cmp->>'dif_grafo_menos_conv')::numeric;
  ics numeric := (cmp->'ic95'->>1)::numeric;
  grav numeric := (select coalesce(sum((x->>'gravacoes')::numeric),0) from jsonb_array_elements(cs->'serie') x);
  semf numeric := (select coalesce(sum((x->>'sem_falha')::numeric),0) from jsonb_array_elements(cs->'serie') x);
  col numeric := case when grav>0 then round(100*semf/grav,1) else 0 end;
  custo numeric := round(coalesce((ag->>'custo_medio_usd')::numeric,0)*5.4212,3);
  selos numeric := (select count(*) from (select (selado_em at time zone 'America/Sao_Paulo')::date d from instituto.placar_selos union select dia from instituto.negocio_selos union select dia from instituto.okr_selos) x where d > current_date - 7);
  krs jsonb;
  pct numeric;
begin
  krs := jsonb_build_array(
    jsonb_build_object('o',1,'kr','1.1','nome','Grafo erra menos que o convencional (diferença de Brier)','valor',dif,'meta','abaixo de zero, com intervalo de 95% todo abaixo de zero','progresso',case when dif<0 and ics<0 then 100 when dif<0 then 50 else 0 end,'fonte','comparacoes (pré-registro I-10)'),
    jsonb_build_object('o',1,'kr','1.2','nome','Casos no teste fora da amostra','valor',(cmp->>'teste')::numeric,'meta',1000,'progresso',least(100,round(100*(cmp->>'teste')::numeric/1000)),'fonte','comparacoes'),
    jsonb_build_object('o',1,'kr','1.3','nome','Coletas diárias do CNJ sem falha (%)','valor',col,'meta',99,'progresso',least(100,round(100*col/99)),'fonte','coletas, 30 dias'),
    jsonb_build_object('o',2,'kr','2.1','nome','Pessoas cadastradas','valor',(ng->>'cadastros_total')::numeric,'meta',50,'progresso',least(100,round(100*(ng->>'cadastros_total')::numeric/50)),'fonte','membros'),
    jsonb_build_object('o',2,'kr','2.2','nome','Membros pagantes (ponto de equilíbrio)','valor',(ng->>'pagantes')::numeric,'meta',7,'progresso',least(100,round(100*(ng->>'pagantes')::numeric/7)),'fonte','pagamentos'),
    jsonb_build_object('o',2,'kr','2.3','nome','Custo médio de IA por resposta (R$)','valor',custo,'meta',0.10,'progresso',case when custo<=0.10 then 100 else round(100*0.10/custo) end,'fonte','agentes_uso, PTAX 5,4212'),
    jsonb_build_object('o',3,'kr','3.1','nome','Disponibilidade do site, CSS e API (%)','valor',(sl->>'geral')::numeric,'meta',99.5,'progresso',least(100,round(100*(sl->>'geral')::numeric/99.5)),'fonte','disponibilidade, sonda a cada 10 min'),
    jsonb_build_object('o',3,'kr','3.2','nome','Incidentes de agente em aberto','valor',(inc->>'abertos')::numeric,'meta',0,'progresso',case when (inc->>'abertos')::numeric=0 then 100 else 0 end,'fonte','agentes_incidentes'),
    jsonb_build_object('o',3,'kr','3.3','nome','Dias com medição selada no Bitcoin (últimos 7)','valor',selos,'meta',7,'progresso',least(100,round(100*selos/7)),'fonte','placar_selos, negocio_selos, okr_selos'));
  select jsonb_agg(k || jsonb_build_object('sha256', encode(extensions.digest((k)::text,'sha256'),'hex'))) into krs from jsonb_array_elements(krs) k;
  select round(avg((k->>'progresso')::numeric)) into pct from jsonb_array_elements(krs) k;
  return jsonb_build_object('objetivos', jsonb_build_array('Provar ou refutar o grafo','Ser vendável','Ser confiável e auditável'),'krs',krs,'progresso_geral',pct,'medido_em',now());
end $$;

create or replace function instituto.selar_okr()
returns void language plpgsql security definer set search_path to 'instituto','public','extensions','pg_temp' as $$
declare r jsonb := instituto.okr_calcular() - 'medido_em'; h text := encode(extensions.digest(r::text,'sha256'),'hex'); p bigint;
begin
  select net.http_post('https://hlraekzvgxdpiiigdxdo.supabase.co/functions/v1/ancorar-hash', jsonb_build_object('digest',h), '{}'::jsonb,
    jsonb_build_object('Content-Type','application/json','Authorization','Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhscmFla3p2Z3hkcGlpaWdkeGRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI4ODEzOTksImV4cCI6MjEwODQ1NzM5OX0.yCNPEGDb7tdf1JIY30WKUbE-xZwjQFwygJFJnvBeyrs','x-cron-secret',(select valor from public.configuracoes where chave='cron_segredo')), 60000) into p;
  insert into instituto.okr_selos(dia,resumo,sha256,pedido) values (current_date,r,h,p)
  on conflict (dia) do update set resumo=excluded.resumo, sha256=excluded.sha256, pedido=excluded.pedido, prova_b64=null, criado_em=now();
end $$;

-- Público: KRs ao vivo + último selo com a prova (preenchida a partir da resposta do ancorar-hash)
create or replace function public.instituto_okr()
returns jsonb language plpgsql security definer set search_path to 'instituto','public','extensions','pg_temp' as $$
declare s instituto.okr_selos; pr text;
begin
  update instituto.okr_selos o set prova_b64 = r.content::jsonb->>'provaB64'
    from net._http_response r where o.prova_b64 is null and r.id=o.pedido and r.status_code=200 and r.content like '{%provaB64%';
  select * into s from instituto.okr_selos where prova_b64 is not null order by dia desc limit 1;
  return instituto.okr_calcular() || jsonb_build_object('selo', case when s.dia is null then null else
    jsonb_build_object('dia',s.dia,'sha256',s.sha256,'prova_b64',s.prova_b64,'resumo',s.resumo) end);
end $$;
grant execute on function public.instituto_okr() to anon, authenticated;
revoke execute on function instituto.okr_calcular() from public, anon, authenticated;
revoke execute on function instituto.selar_okr() from public, anon, authenticated;

select cron.schedule('instituto-okr-selo','57 2 * * *', $$select instituto.selar_okr()$$);
