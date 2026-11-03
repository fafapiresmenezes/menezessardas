-- Passo L03 (I-04): API de probabilidade para imobiliárias, administradoras e garantidoras.
-- Chave de teste com 20 chamadas, gerada na hora e guardada só como sha256.
-- Teste A/B de preço por 30 dias (decisão de M, 03/11 21:07Z): metade das empresas vê a oferta A
-- (custo x 4, por chamada) e metade a oferta B (planos por valor e volume). Só agregados saem daqui.

create table if not exists instituto.b2b_ofertas (
  braco char(1) primary key check (braco in ('A','B')),
  nome text not null,
  regra text not null,
  planos jsonb not null,
  premissas text not null,
  inicio date not null default current_date,
  fim date not null default current_date + 30
);
alter table instituto.b2b_ofertas enable row level security;

insert into instituto.b2b_ofertas(braco, nome, regra, planos, premissas) values
('A', 'Por chamada', 'custo x 4 (regra de M)',
 '[{"plano":"Por chamada","preco_brl":0.25,"unidade":"chamada","minimo":"sem mínimo","cobranca":"fatura mensal pelo uso"}]',
 'Custo por chamada R$ 0,061: metade da infraestrutura paga (Vercel Pro US$ 20 + Supabase Pro US$ 25 = US$ 45 por mês, PTAX 5,42, R$ 244) dividida por 2.000 chamadas no 1º mês. A consulta não usa IA. x 4 = R$ 0,244, arredondado para R$ 0,25.'),
('B', 'Planos por volume', 'valor e volume (hipótese em teste)',
 '[{"plano":"Essencial","preco_brl":490,"unidade":"mês","inclui":500},{"plano":"Profissional","preco_brl":1490,"unidade":"mês","inclui":2500},{"plano":"Corporativo","preco_brl":null,"unidade":"mês","inclui":"sob proposta"}]',
 'Preço ancorado no valor para quem decide a locação: uma inadimplência leva meses de aluguel até o despejo; a chamada custa ao Instituto o mesmo que na oferta A. Hipótese a validar no teste de 30 dias.')
on conflict (braco) do nothing;

create table if not exists instituto.b2b_contatos (
  id uuid primary key default gen_random_uuid(),
  criado_em timestamptz not null default now(),
  empresa text not null,
  segmento text not null check (segmento in ('imobiliaria','administradora','garantidora','outro')),
  email text not null unique,
  braco char(1) not null references instituto.b2b_ofertas(braco),
  origem text,
  aceite_lgpd boolean not null check (aceite_lgpd)
);
alter table instituto.b2b_contatos enable row level security;

create table if not exists instituto.api_chaves (
  hash text primary key,
  contato uuid not null references instituto.b2b_contatos(id),
  tipo text not null default 'teste',
  limite int not null default 20,
  usadas int not null default 0,
  criada_em timestamptz not null default now(),
  ultima_em timestamptz
);
alter table instituto.api_chaves enable row level security;

-- Cadastro B2B: devolve a chave uma única vez e a oferta do braço sorteado por ordem de chegada.
create or replace function public.instituto_api_cadastrar(p_empresa text, p_email text, p_segmento text, p_aceite boolean, p_origem text default null)
returns jsonb language plpgsql security definer set search_path = instituto, public, extensions as $$
declare v_email text := lower(trim(coalesce(p_email,''))); v_emp text := trim(coalesce(p_empresa,'')); v_braco char(1); v_id uuid; v_chave text; o record;
begin
  if not coalesce(p_aceite,false) then return jsonb_build_object('erro','Marque o aceite de uso dos dados de contato.'); end if;
  if length(v_emp) < 2 or length(v_emp) > 120 then return jsonb_build_object('erro','Informe o nome da empresa.'); end if;
  if v_email !~ '^[^@\s]+@[^@\s]+\.[a-z]{2,}$' or length(v_email) > 160 then return jsonb_build_object('erro','E-mail inválido.'); end if;
  if coalesce(p_segmento,'') not in ('imobiliaria','administradora','garantidora','outro') then return jsonb_build_object('erro','Escolha o segmento.'); end if;
  if exists (select 1 from b2b_contatos where email = v_email) then
    return jsonb_build_object('erro','Este e-mail já tem chave de teste. Para outra, escreva para o Instituto.');
  end if;
  if (select count(*) from b2b_contatos where criado_em > now() - interval '1 day') >= 100 then
    return jsonb_build_object('erro','Limite de cadastros de hoje atingido. Tente amanhã.');
  end if;
  v_braco := case when (select count(*) from b2b_contatos) % 2 = 0 then 'A' else 'B' end;
  insert into b2b_contatos(empresa, segmento, email, braco, origem, aceite_lgpd)
    values (v_emp, p_segmento, v_email, v_braco, left(nullif(trim(coalesce(p_origem,'')),''),60), true) returning id into v_id;
  v_chave := 'thy_teste_' || encode(gen_random_bytes(18), 'hex');
  insert into api_chaves(hash, contato) values (encode(digest(v_chave, 'sha256'), 'hex'), v_id);
  select * into o from b2b_ofertas where braco = v_braco;
  return jsonb_build_object('ok', true, 'chave', v_chave, 'limite', 20,
    'oferta', jsonb_build_object('braco', o.braco, 'nome', o.nome, 'regra', o.regra, 'planos', o.planos, 'premissas', o.premissas));
end $$;
revoke all on function public.instituto_api_cadastrar(text,text,text,boolean,text) from public;
grant execute on function public.instituto_api_cadastrar(text,text,text,boolean,text) to anon, authenticated, service_role;

-- Previsão pela chave: confere o limite, soma o uso e devolve probabilidade, IC 95% e amostra.
create or replace function public.instituto_api_prever(p_chave text, p_tribunal text, p_classe text, p_orgao text default null, p_assunto integer default null)
returns jsonb language plpgsql security definer set search_path = instituto, public, extensions as $$
declare k record; r jsonb; n int;
begin
  select * into k from api_chaves where hash = encode(digest(coalesce(p_chave,''), 'sha256'), 'hex') for update;
  if not found then return jsonb_build_object('erro','Chave inválida.', 'codigo', 401); end if;
  if k.usadas >= k.limite then return jsonb_build_object('erro','As 20 chamadas de teste acabaram. Fale com o Instituto para contratar.', 'codigo', 429); end if;
  if coalesce(p_tribunal,'') !~* '^TJ[A-Z]{2,3}$' or coalesce(p_classe,'') = '' then
    return jsonb_build_object('erro','Informe tribunal (ex.: TJRJ) e classe.', 'codigo', 400);
  end if;
  r := public.instituto_prever(p_tribunal, p_classe, nullif(p_orgao,''), p_assunto);
  if r ? 'erro' then return r || jsonb_build_object('codigo', 404); end if;
  update api_chaves set usadas = usadas + 1, ultima_em = now() where hash = k.hash;
  insert into api_uso(dia, rota, chamadas) values (current_date, 'api-b2b', 1)
    on conflict (dia, rota) do update set chamadas = api_uso.chamadas + 1;
  n := (r->'convencional'->>'n')::int;
  return r || jsonb_build_object(
    'amostra_pequena', n < 30,
    'aviso_amostra', case when n < 30 then 'Amostra pequena (menos de 30 julgamentos): use só como sinal, com a margem ao lado.' end,
    'uso', jsonb_build_object('usadas', k.usadas + 1, 'limite', k.limite),
    'api', 'previsao-locacao v1 (L03)');
end $$;
revoke all on function public.instituto_api_prever(text,text,text,text,integer) from public;
grant execute on function public.instituto_api_prever(text,text,text,text,integer) to anon, authenticated, service_role;

-- Painel: só contagens, por braço e segmento, para o teste A/B em /negocio.html.
create or replace function public.instituto_b2b_resumo()
returns jsonb language sql stable security definer set search_path = instituto, public as $$
  select jsonb_build_object(
    'contatos', (select count(*) from b2b_contatos),
    'por_braco', (select coalesce(jsonb_object_agg(braco, c), '{}') from (select braco, count(*) c from b2b_contatos group by 1) x),
    'por_segmento', (select coalesce(jsonb_object_agg(segmento, c), '{}') from (select segmento, count(*) c from b2b_contatos group by 1) x),
    'chamadas_teste', (select coalesce(sum(usadas),0) from api_chaves),
    'pagantes', 0,
    'teste_ab', (select jsonb_build_object('inicio', min(inicio), 'fim', max(fim)) from b2b_ofertas),
    'ofertas', (select jsonb_agg(jsonb_build_object('braco', braco, 'nome', nome, 'regra', regra, 'planos', planos, 'premissas', premissas) order by braco) from b2b_ofertas));
$$;
revoke all on function public.instituto_b2b_resumo() from public;
grant execute on function public.instituto_b2b_resumo() to anon, authenticated, service_role;
