-- I-11 (pré-registro sha256 e98b107a…, OTS 2026-10-31T19:46Z). Rodada única. Nada abaixo usa o período de teste para ajuste.
create table if not exists instituto.i11_base(id text primary key, d date, y float8, tribunal text, classe text, ano int, assunto int, orgao text, assuntos int[], bloco int);
create table if not exists instituto.i11_x(id text, modelo text, f text, v float8);
create index if not exists i11_x_idx on instituto.i11_x(modelo, id);
create table if not exists instituto.i11_w(modelo text, f text, w float8, g2 float8, primary key(modelo,f));
create table if not exists instituto.i11_rodadas(id bigserial primary key, em timestamptz default now(), sha256_codigo text, sha256_base text, lambda_b float8, lambda_c float8, resultado jsonb);
alter table instituto.i11_base enable row level security; alter table instituto.i11_x enable row level security;
alter table instituto.i11_w enable row level security; alter table instituto.i11_rodadas enable row level security;

-- 1. Base congelada: só desfechos de mérito; y = procedência total ou parcial.
create or replace function instituto.i11_congelar() returns text language plpgsql as $$
declare corte date; h text;
begin
  if exists (select 1 from instituto.i11_base) then raise exception 'base já congelada: rodada única'; end if;
  insert into instituto.i11_base(id,d,y,tribunal,classe,ano,assunto,orgao,assuntos)
  select id, data_desfecho, case when desfecho in ('procedencia','parcial') then 1 else 0 end, tribunal, classe,
         extract(year from data_ajuizamento)::int, (assuntos->0->>'c')::int, coalesce(orgao,'?'),
         array(select (a->>'c')::int from jsonb_array_elements(coalesce(assuntos,'[]')) a where a->>'c' is not null)
  from instituto.processos where desfecho in ('procedencia','parcial','improcedencia') and data_desfecho is not null;
  select percentile_disc(0.8) within group (order by d) into corte from instituto.i11_base;
  update instituto.i11_base set bloco = 6 where d > corte;
  update instituto.i11_base b set bloco = s.bl from (select id, ntile(5) over (order by d, id) bl from instituto.i11_base where d <= corte) s where s.id = b.id;
  select encode(digest(string_agg(id||':'||y||':'||d, ',' order by id),'sha256'),'hex') into h from instituto.i11_base;
  return h;
end $$;

-- 2. Variáveis. B: tribunal, classe, ano de ajuizamento, assunto principal. C: B + grafo.
create or replace function instituto.i11_variaveis() returns void language plpgsql as $$
declare m constant float8 := 10;
begin
  if exists (select 1 from instituto.i11_x) then raise exception 'variáveis já calculadas'; end if;
  insert into instituto.i11_x select id, mo, f, 1 from instituto.i11_base, unnest(array['B','C']) mo,
    unnest(array['bias','t:'||tribunal,'c:'||classe,'a:'||coalesce(ano::text,'?'),'s:'||coalesce(assunto::text,'?')]) f;
  -- órgão × assunto principal, codificação fora da dobra (treino) e com todo o treino (teste), centrada na média.
  insert into instituto.i11_x
  select b.id, 'C', 'oa', ((coalesce(s.k,0) + m*g.p)/(coalesce(s.n,0) + m)) - g.p
  from instituto.i11_base b
  cross join lateral (select avg(y) p from instituto.i11_base t where t.bloco <= 5 and t.bloco <> b.bloco) g
  left join lateral (select sum(y) k, count(*) n from instituto.i11_base t where t.bloco <= 5 and t.bloco <> b.bloco
                     and t.orgao = b.orgao and t.assunto is not distinct from b.assunto) s on true;
  -- normas ligadas (fundamentadoEm por assunto ou classe), teses invocadas e precedente ligado.
  insert into instituto.i11_x select distinct b.id, 'C', 'n:'||x.norma, 1 from instituto.i11_base b
    join lateral (select an.norma from instituto.assunto_norma an where an.assunto = any(b.assuntos)
                  union select cn.norma from instituto.classe_norma cn where cn.classe = b.classe) x on true;
  insert into instituto.i11_x select distinct b.id, 'C', 'te:'||at.tese, 1 from instituto.i11_base b join instituto.assunto_tese at on at.assunto = any(b.assuntos);
  insert into instituto.i11_x select distinct b.id, 'C', 'prec', 1 from instituto.i11_base b join instituto.assunto_tese at on at.assunto = any(b.assuntos)
    join instituto.tese_precedente tp on tp.tese = at.tese;
end $$;

-- 3. Logística com L2 (bias sem penalidade), AdaGrad, 400 iterações. Ajusta só em blocos 1..p_ate.
create or replace function instituto.i11_ajustar(p_modelo text, p_ate int, p_lambda float8, p_iter int default 400) returns void language plpgsql as $$
declare it int; n int; lr constant float8 := 0.5;
begin
  update instituto.i11_w set w = 0, g2 = 1e-8 where modelo = p_modelo;
  insert into instituto.i11_w select distinct p_modelo, x.f, 0, 1e-8 from instituto.i11_x x where x.modelo = p_modelo on conflict (modelo,f) do update set w = 0, g2 = 1e-8;
  select count(*) into n from instituto.i11_base where bloco <= p_ate;
  create temp table _xx(id text, f text, v float8, y float8) on commit drop;
  insert into _xx select x.id, x.f, x.v, b.y from instituto.i11_x x join instituto.i11_base b using (id) where x.modelo = p_modelo and b.bloco <= p_ate;
  create index on _xx(f); create index on _xx(id);
  for it in 1..p_iter loop
    with z as (select xx.id, max(xx.y) y, 1/(1+exp(-greatest(-30,least(30,sum(xx.v*w.w))))) p from _xx xx join instituto.i11_w w on w.modelo=p_modelo and w.f=xx.f group by xx.id),
         g as (select xx.f, sum((z.p - z.y)*xx.v)/n gr from _xx xx join z using (id) group by xx.f)
    update instituto.i11_w w set g2 = w.g2 + (g.gr + case when w.f='bias' then 0 else p_lambda*w.w/n end)^2,
           w = w.w - lr*(g.gr + case when w.f='bias' then 0 else p_lambda*w.w/n end)/sqrt(w.g2 + (g.gr + case when w.f='bias' then 0 else p_lambda*w.w/n end)^2)
    from g where w.modelo = p_modelo and w.f = g.f;
  end loop;
end $$;

-- 4. Previsões de um bloco com os pesos atuais.
create or replace function instituto.i11_prever(p_modelo text, p_bloco int) returns table(id text, y float8, p float8) language sql as $$
  select b.id, b.y, 1/(1+exp(-greatest(-30,least(30,coalesce(sum(x.v*w.w),0))))) from instituto.i11_base b
  join instituto.i11_x x on x.id=b.id and x.modelo=p_modelo left join instituto.i11_w w on w.modelo=p_modelo and w.f=x.f
  where b.bloco = p_bloco group by b.id, b.y $$;


-- 5. Avaliação no teste (bloco 6): A taxa-base, B e C; Brier, BSS, ECE (10 faixas), log-loss, AUC; bootstrap pareado 2.000.
create or replace function instituto.i11_metricas(y float8[], p float8[]) returns jsonb language sql immutable as $$
  with t as (select u.y, u.p from unnest(y,p) u(y,p)),
       bins as (select least(9,floor(p*10))::int b, sum(p) sp, sum(y) sy from t group by 1),
       rk as (select y, rank() over (order by p) r from t),
       c as (select count(*) filter (where y=1) n1, count(*) filter (where y=0) n0 from t)
  select jsonb_build_object(
    'brier', (select avg((p-y)^2) from t),
    'logloss', (select -avg(y*ln(greatest(p,1e-9)) + (1-y)*ln(greatest(1-p,1e-9))) from t),
    'ece', (select sum(abs(sp-sy)) from bins)/(select count(*) from t),
    'auc', ((select sum(r) from rk where y=1) - (select n1*(n1+1)/2.0 from c)) / nullif((select n1*n0 from c),0))
$$;

create or replace function instituto.i11_avaliar() returns jsonb language plpgsql as $$
declare ya float8[]; pa float8[]; pb float8[]; pc float8[]; n int; i int; s1 float8; s2 float8; s3 float8;
        bcb float8[] := '{}'; bca float8[] := '{}'; bba float8[] := '{}'; mb jsonb; mc jsonb; ma jsonb; v text; ic jsonb;
begin
  create temp table _pr on commit drop as select b.id, b.y,
    coalesce((select (sum(t.y)+1)/(count(*)+2) from instituto.i11_base t where t.bloco<=5 and t.tribunal=b.tribunal and t.classe=b.classe),
             (select (sum(y)+1)/(count(*)+2) from instituto.i11_base where bloco<=5)) pa, qb.p pb, qc.p pc
    from instituto.i11_base b join instituto.i11_prever('B',6) qb on qb.id=b.id join instituto.i11_prever('C',6) qc on qc.id=b.id where b.bloco=6;
  select array_agg(y order by id), array_agg(pa order by id), array_agg(pb order by id), array_agg(pc order by id), count(*) into ya, pa, pb, pc, n from _pr;
  ma := instituto.i11_metricas(ya,pa); mb := instituto.i11_metricas(ya,pb); mc := instituto.i11_metricas(ya,pc);
  perform setseed(0.11);
  for i in 1..2000 loop
    select avg((pc[k]-ya[k])^2 - (pb[k]-ya[k])^2), avg((pc[k]-ya[k])^2 - (pa[k]-ya[k])^2), avg((pb[k]-ya[k])^2 - (pa[k]-ya[k])^2)
      into s1, s2, s3 from (select 1 + floor(random()*n)::int k from generate_series(1,n)) z;
    bcb := bcb || s1; bca := bca || s2; bba := bba || s3;
  end loop;
  ic := jsonb_build_object(
    'c_menos_b', jsonb_build_array((select percentile_cont(0.025) within group (order by x) from unnest(bcb) x),(select percentile_cont(0.975) within group (order by x) from unnest(bcb) x)),
    'c_menos_a', jsonb_build_array((select percentile_cont(0.025) within group (order by x) from unnest(bca) x),(select percentile_cont(0.975) within group (order by x) from unnest(bca) x)),
    'b_menos_a', jsonb_build_array((select percentile_cont(0.025) within group (order by x) from unnest(bba) x),(select percentile_cont(0.975) within group (order by x) from unnest(bba) x)));
  v := case when (ic->'c_menos_b'->>1)::float8 < 0 and (mc->>'ece')::float8 <= 0.05 then 'grafo vence'
            when (ic->'c_menos_b'->>0)::float8 > 0 then 'grafo perde' else 'inconclusivo' end;
  return jsonb_build_object('teste', n, 'taxa_teste', (select avg(y) from _pr),
    'A', ma, 'B', mb || jsonb_build_object('bss', 1 - (mb->>'brier')::float8/(ma->>'brier')::float8),
    'C', mc || jsonb_build_object('bss', 1 - (mc->>'brier')::float8/(ma->>'brier')::float8),
    'dif_brier_c_menos_b', (mc->>'brier')::float8 - (mb->>'brier')::float8, 'ic95', ic, 'veredito', v);
end $$;
