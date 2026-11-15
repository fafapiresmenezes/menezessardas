-- 122 — Passo C1 do plano mestre THEYE: a ontologia de eventos, o vocabulário comum da
-- previsão a partir de dados públicos (GDELT, ANA/SNIRH, ANM, PRODES, MapBiomas, CEPEA, CONAB, B3, IBGE).
-- Nada é ingerido aqui: este arquivo só cria o esquema. Os passos C2 a C18 gravam nele e leem dele.
--
-- Decisões de desenho, em português claro:
--  1. Tudo vive no esquema "instituto", junto das séries do motor (instituto.motor_series). Não é dado
--     de escritório: é dado público do Instituto, logo não tem escritorio_id nem RLS por escritório.
--  2. Identificadores de fora (CNPJ, código IBGE, processo ANM, ator GDELT) vão num único campo jsonb
--     chamado "identificadores". Assim uma fonte nova não obriga a criar coluna nova.
--  3. Toda linha das quatro tabelas carrega a sua fonte e um hash do próprio conteúdo
--     ("conteudo_hash"), para a ingestão ser idempotente e o número ser reconferível.
--     O hash cobre só o conteúdo: nunca o id da linha nem a hora em que ela foi gravada.
--  4. Tempo sempre em timestamptz. Em eventos, "ocorrido_em" é quando a coisa aconteceu e
--     "observado_em" é quando nós soubemos. São diferentes, e essa diferença é o que permite
--     medir atraso de informação (nowcasting) sem enganar a si mesmo.
--  5. Geografia sem PostGIS (o banco não tem a extensão): o desenho exato fica em GeoJSON (jsonb)
--     e a caixa envolvente (min/max de latitude e longitude) fica em colunas numéricas indexáveis.
--     "Este evento aconteceu dentro desta área?" é respondido primeiro pela caixa (rápido, por índice)
--     e, se precisar de exatidão, pelo GeoJSON na aplicação. Rejeitamos depender de PostGIS para não
--     travar o passo C1 numa extensão que ainda não existe no projeto.
--  6. Escrita só pela service role (robôs de coleta). Quem está logado pode ler. anon não vê nada:
--     o site público lê por funções security definer, como já faz nos blocos B11 e B15.
-- Só acrescenta: nenhuma tabela, coluna ou política existente é alterada ou removida.

create schema if not exists instituto;

-- ---------------------------------------------------------------------------
-- Forma canônica de um jsonb: chaves em ordem alfabética, sem espaços. Serve para um objeto
-- (identificadores, atributos, carga bruta) virar sempre o mesmo texto, e assim sempre o mesmo hash.
-- É a mesma regra da função jsonCanonico em src/lib/predicao/ontologia.ts.
-- plpgsql porque a função chama a si mesma (objeto dentro de objeto).
-- ---------------------------------------------------------------------------
create or replace function instituto.json_canonico(p_valor jsonb)
returns text language plpgsql immutable set search_path = 'instituto', 'pg_temp' as $$
begin
  if p_valor is null then return ''; end if;
  if jsonb_typeof(p_valor) = 'object' then
    return '{' || coalesce((
      select string_agg(to_json(e.chave)::text || ':' || instituto.json_canonico(e.valor), ',' order by e.chave)
      from jsonb_each(p_valor) as e(chave, valor)), '') || '}';
  end if;
  if jsonb_typeof(p_valor) = 'array' then
    return '[' || coalesce((
      select string_agg(instituto.json_canonico(e.valor), ',' order by e.i)
      from jsonb_array_elements(p_valor) with ordinality as e(valor, i)), '') || ']';
  end if;
  return p_valor::text;
end $$;

-- ---------------------------------------------------------------------------
-- Hash de conteúdo: mesma receita no banco e no navegador (src/lib/predicao/ontologia.ts).
-- Recebe um objeto jsonb plano, monta "chave=valor" ordenado por chave, uma linha cada,
-- e devolve o SHA-256 em hexadecimal. Mesma entrada, mesmo hash, sempre.
-- Valor nulo entra como texto vazio. Não usamos o texto do jsonb inteiro porque a forma
-- como Postgres e JavaScript escrevem números não é a mesma.
-- Regra para quem ingere: todo valor entra como texto escalar; um campo que é objeto entra
-- como a sua forma canônica (instituto.json_canonico / jsonCanonico), e número fracionário
-- entra como texto, pela mesma razão. Assim o hash do banco e o do navegador batem.
-- ---------------------------------------------------------------------------
create or replace function instituto.ontologia_hash(p_campos jsonb)
returns text language sql immutable set search_path = '' as $$
  select encode(sha256(convert_to(coalesce((
    select string_agg(c.chave || '=' || coalesce(c.valor, ''), E'\n' order by c.chave)
    from jsonb_each_text(coalesce(p_campos, '{}'::jsonb)) as c(chave, valor)
  ), ''), 'UTF8')), 'hex')
$$;

-- ---------------------------------------------------------------------------
-- fontes: de onde vem cada linha, e o que a licença permite.
-- Existe porque licença não é detalhe: o mosaico Sentinel-2 da EOX, por exemplo, não é
-- para uso comercial. Quem lê um estudo precisa saber disso sem perguntar.
-- ---------------------------------------------------------------------------
create table if not exists instituto.fontes (
  codigo text primary key check (codigo ~ '^[a-z0-9_.:-]{2,60}$'),  -- 'gdelt', 'ana_snirh', 'anm', 'prodes', 'cepea', 'b3', 'ibge'
  nome text not null,
  url text,
  licenca text,                                 -- nome da licença, como a fonte a declara
  uso_comercial boolean not null default false, -- false = não pode entrar em produto pago
  observacao text,
  criado_em timestamptz not null default now()
);
alter table instituto.fontes enable row level security;
create policy fontes_select on instituto.fontes for select to authenticated using (true);
revoke all on instituto.fontes from anon;

-- ---------------------------------------------------------------------------
-- entidades: as coisas de que o mundo é feito. Uma empresa, um órgão, um município,
-- uma bacia, uma mina, uma commodity. Cada uma com um tipo estável e um nome legível.
-- A "chave_natural" é o identificador que escolhemos como principal dentro do tipo
-- (CNPJ só com dígitos, código IBGE, número do processo ANM, código do ator GDELT),
-- e é por ela que a ingestão reencontra a entidade em vez de duplicá-la.
-- ---------------------------------------------------------------------------
create table if not exists instituto.entidades (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in (
    'empresa', 'orgao_publico', 'municipio', 'estado', 'pais',
    'bacia', 'corpo_dagua', 'mina', 'empreendimento', 'commodity', 'contrato_futuro', 'pessoa_juridica_outra')),
  nome text not null check (length(btrim(nome)) between 2 and 300),
  nome_normalizado text generated always as (lower(btrim(nome))) stored,
  identificadores jsonb not null default '{}'::jsonb check (jsonb_typeof(identificadores) = 'object'),
  chave_natural text not null check (length(btrim(chave_natural)) between 1 and 120),
  atributos jsonb not null default '{}'::jsonb check (jsonb_typeof(atributos) = 'object'),
  fonte text not null references instituto.fontes(codigo),
  conteudo_hash text not null check (conteudo_hash ~ '^[0-9a-f]{64}$'),
  criado_em timestamptz not null default now()
);
create unique index if not exists entidades_chave_idx on instituto.entidades (tipo, chave_natural);
create index if not exists entidades_nome_idx on instituto.entidades (nome_normalizado);
create index if not exists entidades_ident_idx on instituto.entidades using gin (identificadores jsonb_path_ops);
create index if not exists entidades_fonte_hash_idx on instituto.entidades (fonte, conteudo_hash);
alter table instituto.entidades enable row level security;
create policy entidades_select on instituto.entidades for select to authenticated using (true);
revoke all on instituto.entidades from anon;

-- ---------------------------------------------------------------------------
-- lugares: geografia. Serve para município, estado, bacia, polígono ou ponto.
-- O código IBGE do município importa, por isso tem coluna e índice próprios.
-- "pai_id" permite dizer que um município está dentro de um estado, ou uma sub-bacia
-- dentro de uma bacia, sem precisar de cálculo geométrico.
-- A caixa envolvente responde "este evento caiu dentro desta área?" só com índice.
-- ---------------------------------------------------------------------------
create table if not exists instituto.lugares (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('municipio', 'estado', 'regiao', 'pais', 'bacia', 'sub_bacia', 'poligono', 'ponto')),
  nome text not null check (length(btrim(nome)) between 2 and 300),
  uf text check (uf ~ '^[A-Z]{2}$'),
  codigo_ibge text check (codigo_ibge ~ '^[0-9]{2,7}$'),   -- 7 dígitos no município, 2 na UF
  pai_id uuid references instituto.lugares(id),
  -- Ponto: latitude e longitude. Área: GeoJSON em "geometria" e a caixa nas quatro colunas abaixo.
  latitude numeric(9,6) check (latitude between -90 and 90),
  longitude numeric(9,6) check (longitude between -180 and 180),
  geometria jsonb check (geometria is null or jsonb_typeof(geometria) = 'object'),
  lat_min numeric(9,6), lat_max numeric(9,6),
  lon_min numeric(9,6), lon_max numeric(9,6),
  identificadores jsonb not null default '{}'::jsonb check (jsonb_typeof(identificadores) = 'object'),
  fonte text not null references instituto.fontes(codigo),
  conteudo_hash text not null check (conteudo_hash ~ '^[0-9a-f]{64}$'),
  criado_em timestamptz not null default now(),
  constraint lugares_caixa_coerente check (
    (lat_min is null and lat_max is null and lon_min is null and lon_max is null)
    or (lat_min <= lat_max and lon_min <= lon_max))
);
create unique index if not exists lugares_ibge_idx on instituto.lugares (codigo_ibge) where codigo_ibge is not null;
create index if not exists lugares_tipo_uf_idx on instituto.lugares (tipo, uf, nome);
create index if not exists lugares_caixa_idx on instituto.lugares (lat_min, lat_max, lon_min, lon_max);
create index if not exists lugares_pai_idx on instituto.lugares (pai_id);
create index if not exists lugares_fonte_hash_idx on instituto.lugares (fonte, conteudo_hash);
alter table instituto.lugares enable row level security;
create policy lugares_select on instituto.lugares for select to authenticated using (true);
revoke all on instituto.lugares from anon;

-- ---------------------------------------------------------------------------
-- eventos: algo que aconteceu, numa hora, num lugar, envolvendo entidades, contado por uma fonte.
--   ocorrido_em  = quando aconteceu no mundo
--   observado_em = quando a informação chegou até nós
-- As duas são obrigatórias e separadas de propósito: o atraso entre elas é a matéria-prima
-- do nowcasting, e misturá-las faz o modelo parecer melhor do que é.
--   confianca = 0 a 1, quando a fonte permite estimar
--   tom       = -10 a 10 (o "tone" do GDELT cabe aqui), quando a fonte dá
--   bruto     = a carga original, como veio, para poder reprocessar sem recoletar
-- O par (fonte, conteudo_hash) é único: reprocessar a mesma coleta não duplica evento.
-- ---------------------------------------------------------------------------
create table if not exists instituto.eventos (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (length(btrim(tipo)) between 2 and 80),  -- 'protesto', 'outorga_agua', 'licenca_mineraria', 'desmatamento', 'preco_fechamento', ...
  subtipo text,
  titulo text check (length(titulo) <= 500),
  ocorrido_em timestamptz not null,
  observado_em timestamptz not null default now(),
  lugar_id uuid references instituto.lugares(id),
  latitude numeric(9,6) check (latitude between -90 and 90),
  longitude numeric(9,6) check (longitude between -180 and 180),
  confianca numeric(5,4) check (confianca between 0 and 1),
  tom numeric(6,3) check (tom between -10 and 10),
  valor numeric,                 -- quando o evento é um número (preço, vazão, área em hectares)
  unidade text,                  -- 'BRL/sc', 'm3/s', 'ha'
  bruto jsonb not null default '{}'::jsonb check (jsonb_typeof(bruto) = 'object'),
  fonte text not null references instituto.fontes(codigo),
  conteudo_hash text not null check (conteudo_hash ~ '^[0-9a-f]{64}$'),
  criado_em timestamptz not null default now()
  -- De propósito não exigimos observado_em >= ocorrido_em: uma fonte pode noticiar hoje algo
  -- marcado para a semana que vem (leilão, audiência, vencimento de contrato futuro). O atraso
  -- (observado_em - ocorrido_em) é calculado na leitura e pode ser negativo nesses casos.
);
create unique index if not exists eventos_fonte_hash_idx on instituto.eventos (fonte, conteudo_hash);
-- Consultas de C7/C8: eventos por lugar numa janela de tempo, e eventos por tipo na janela.
create index if not exists eventos_lugar_tempo_idx on instituto.eventos (lugar_id, ocorrido_em desc);
create index if not exists eventos_tipo_tempo_idx on instituto.eventos (tipo, ocorrido_em desc);
create index if not exists eventos_ocorrido_idx on instituto.eventos (ocorrido_em desc);
create index if not exists eventos_observado_idx on instituto.eventos (observado_em desc);
create index if not exists eventos_fonte_tempo_idx on instituto.eventos (fonte, observado_em desc);
create index if not exists eventos_coord_idx on instituto.eventos (latitude, longitude) where latitude is not null;
create index if not exists eventos_bruto_idx on instituto.eventos using gin (bruto jsonb_path_ops);
alter table instituto.eventos enable row level security;
create policy eventos_select on instituto.eventos for select to authenticated using (true);
revoke all on instituto.eventos from anon;

-- ---------------------------------------------------------------------------
-- evento_entidades: quem participou do evento e em que papel.
-- Tabela de ligação porque um evento envolve várias entidades (quem agiu, quem sofreu,
-- qual commodity, qual órgão) e uma entidade aparece em muitos eventos.
-- ---------------------------------------------------------------------------
create table if not exists instituto.evento_entidades (
  evento_id uuid not null references instituto.eventos(id) on delete cascade,
  entidade_id uuid not null references instituto.entidades(id) on delete cascade,
  papel text not null default 'envolvido' check (papel in ('ator', 'alvo', 'orgao', 'objeto', 'envolvido', 'mencionado')),
  primary key (evento_id, entidade_id, papel)
);
-- Consulta de C7/C8: todos os eventos de uma entidade.
create index if not exists evento_entidades_entidade_idx on instituto.evento_entidades (entidade_id, evento_id);
alter table instituto.evento_entidades enable row level security;
create policy evento_entidades_select on instituto.evento_entidades for select to authenticated using (true);
revoke all on instituto.evento_entidades from anon;

-- ---------------------------------------------------------------------------
-- arestas: relações com tipo entre duas entidades, com direção (de origem para destino),
-- peso e janela de validade, porque relação começa e termina: uma empresa controla outra
-- até vender, um fornecedor fornece até trocar de cliente.
-- "valido_ate" nulo significa "ainda vale".
-- ---------------------------------------------------------------------------
create table if not exists instituto.arestas (
  id uuid primary key default gen_random_uuid(),
  origem_id uuid not null references instituto.entidades(id) on delete cascade,
  destino_id uuid not null references instituto.entidades(id) on delete cascade,
  tipo text not null check (tipo in (
    'controla', 'fornece', 'licencia', 'montante_de', 'opera_em', 'pertence_a', 'concorre_com', 'regula')),
  peso numeric(10,4) check (peso >= 0),
  valido_de timestamptz not null default now(),
  valido_ate timestamptz,
  atributos jsonb not null default '{}'::jsonb check (jsonb_typeof(atributos) = 'object'),
  fonte text not null references instituto.fontes(codigo),
  conteudo_hash text not null check (conteudo_hash ~ '^[0-9a-f]{64}$'),
  criado_em timestamptz not null default now(),
  constraint arestas_sem_laco check (origem_id <> destino_id),
  constraint arestas_janela_coerente check (valido_ate is null or valido_ate > valido_de)
);
create unique index if not exists arestas_fonte_hash_idx on instituto.arestas (fonte, conteudo_hash);
-- Consulta de C7/C8: vizinhos de uma entidade, pelos dois lados.
create index if not exists arestas_origem_idx on instituto.arestas (origem_id, tipo, valido_de desc);
create index if not exists arestas_destino_idx on instituto.arestas (destino_id, tipo, valido_de desc);
create index if not exists arestas_vigencia_idx on instituto.arestas (valido_ate nulls first, valido_de desc);
alter table instituto.arestas enable row level security;
create policy arestas_select on instituto.arestas for select to authenticated using (true);
revoke all on instituto.arestas from anon;

-- Leitura do esquema para quem está logado; escrita fica só com a service role.
grant usage on schema instituto to authenticated;
grant select on instituto.fontes, instituto.entidades, instituto.lugares,
  instituto.eventos, instituto.evento_entidades, instituto.arestas to authenticated;
grant execute on function instituto.ontologia_hash(jsonb) to authenticated;
grant execute on function instituto.json_canonico(jsonb) to authenticated;

-- Fontes já previstas no plano, com o que sabemos da licença. Linha nenhuma é sobrescrita:
-- se o código já existe, fica como está.
insert into instituto.fontes (codigo, nome, url, licenca, uso_comercial, observacao)
select * from (values
  ('gdelt',     'GDELT 2.0 (eventos e noticiário)', 'https://www.gdeltproject.org', 'GDELT Terms of Use', true,  'Volume e tom do noticiário; nunca pessoa identificada.'),
  ('ana_snirh', 'ANA / SNIRH (água)',               'https://www.snirh.gov.br',     'Dados abertos gov.br', true, 'Vazão, nível, outorga.'),
  ('anm',       'ANM (mineração)',                  'https://www.gov.br/anm',       'Dados abertos gov.br', true, 'Processos e títulos minerários.'),
  ('prodes',    'INPE / PRODES (desmatamento)',     'http://terrabrasilis.dpi.inpe.br', 'Dados abertos INPE', true, 'Série anual de desmatamento.'),
  ('mapbiomas', 'MapBiomas (uso e cobertura)',      'https://mapbiomas.org',        'CC BY-SA 4.0', true, 'Exige atribuição e mesma licença na redistribuição.'),
  ('cepea',     'CEPEA/USP (indicadores agrícolas)','https://cepea.esalq.usp.br',   'Uso com citação da fonte', false, 'Conferir condições antes de uso comercial.'),
  ('conab',     'CONAB (safras e estoques)',        'https://www.conab.gov.br',     'Dados abertos gov.br', true, 'Levantamentos de safra.'),
  ('b3',        'B3 (derivativos agrícolas)',       'https://www.b3.com.br',        'Termos da B3', false, 'Cotação com atraso; redistribuição restrita.'),
  ('ibge',      'IBGE (malha e códigos municipais)','https://www.ibge.gov.br',      'Dados abertos IBGE', true, 'Código de município é a chave de geografia.'),
  ('eox_s2',    'Sentinel-2 cloudless (EOX)',       'https://s2maps.eu',            'CC BY-NC-SA 4.0', false, 'NÃO COMERCIAL: só ilustração em material sem venda.')
) as f(codigo, nome, url, licenca, uso_comercial, observacao)
where not exists (select 1 from instituto.fontes x where x.codigo = f.codigo);
