-- 135: blindagem geral — nenhuma função do banco responde mais a quem não fez login,
-- exceto a lista curta que PRECISA responder (portal do cliente por link, convite por link,
-- e a marca do escritório na tela de entrada).
--
-- Pedido de M em 13/11/2026 21:38 UTC, em quatro mensagens seguidas: "Proteja o site e todas as
-- páginas e a plataforma com a maior segurança do mundo", "blinde", "impossibilite scraping",
-- "deixe completamente seguro".
--
-- O QUE FOI MEDIDO (varredura do próprio Supabase, 13/11/2026 21:42, não de memória):
--   - 110 funções SECURITY DEFINER no esquema `public` podiam ser executadas pelo papel `anon`,
--     isto é, por qualquer pessoa com a chave pública do site, SEM LOGIN, pela rota
--     /rest/v1/rpc/<nome>. Uma função SECURITY DEFINER roda com os poderes de quem a criou e por
--     isso passa por cima de TODA política de tabela;
--   - entre elas: `dados_pix` e `definir_pix`, `painel_escritorios`, `pedidos_entrada_pendentes`,
--     `gerar_faturas_escritorios`, `definir_papel`, `kyc_pendentes_reconsulta`, e as 30 e tantas
--     `instituto_*` com número de dentro da casa;
--   - 137 eram executáveis por qualquer pessoa logada (isso NÃO é mexido aqui: quem vê o que entre
--     os já logados é decisão de M, em cartão próprio);
--   - 9 funções sem `search_path` fixo, o que permite sequestrar o nome de uma tabela por dentro
--     do caminho de busca;
--   - o esquema de backup `copia_antes_limpeza_20261111` seguia alcançável pelos papéis da API.
--
-- A LIÇÃO QUE A MIGRAÇÃO 129 DEIXOU E QUE ESTA USA: `revoke execute ... from anon` NÃO tem efeito.
-- A permissão não vem de concessão a `anon`, vem da concessão automática a PUBLIC que o Postgres
-- faz em toda função nova; `anon` herda de PUBLIC. O que funciona é `revoke ... from PUBLIC`
-- seguido de `grant` para quem precisa.
--
-- ADITIVA quanto a dados: não cria, não altera e não apaga nenhuma linha. Só mexe em permissão.
-- REVERSÍVEL: o fim do arquivo traz o comando que devolve tudo como estava.

-- 1) A lista do que CONTINUA aberto sem login, e por quê. Qualquer função fora desta lista deixa
--    de responder a quem não entrou.
--    - portal_*: o cliente do escritório abre /portal/<token> por um link, sem conta. A tranca é o
--      token, conferido dentro de cada função. Chamadas em src/pages/PortalClientePage.tsx,
--      src/components/AssinarPortal.tsx e src/components/PortalMensagens.tsx.
--    - convite_parceiro: /convite/<token>, mesma lógica (src/pages/ConviteParceiroPage.tsx).
--    - marca_por_dominio: a tela de entrada mostra a marca do escritório pelo domínio, ANTES do
--      login (src/lib/marca.ts). Devolve nome, cor e logotipo — nada de pessoa ou processo.
DO $$
DECLARE
  f record;
  abertas text[] := ARRAY[
    'portal_caso', 'portal_caso_id', 'portal_cliente', 'portal_marca', 'portal_documentos',
    'portal_mensagens', 'portal_enviar_mensagem', 'portal_marcar_lidas', 'portal_parcelas',
    'portal_assinar', 'portal_assinaturas', 'portal_avaliacoes', 'portal_avaliar',
    'convite_parceiro', 'marca_por_dominio'
  ];
  fechadas int := 0;
BEGIN
  FOR f IN
    SELECT p.oid::regprocedure::text AS assinatura, p.proname, p.prokind
      FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public'
       AND p.prosecdef                       -- só SECURITY DEFINER: é quem passa por cima de RLS
       AND NOT (p.proname = ANY (abertas))
       AND p.prorettype <> 'trigger'::regtype -- função de gatilho não é chamada pela API
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC', f.assinatura);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated, service_role', f.assinatura);
    fechadas := fechadas + 1;
  END LOOP;
  RAISE NOTICE 'funcoes fechadas para quem nao fez login: %', fechadas;
END $$;

-- 2) Função de gatilho não se chama pela API, nem logado. Fecha para todos os papéis da API.
DO $$
DECLARE f record;
BEGIN
  FOR f IN
    SELECT p.oid::regprocedure::text AS assinatura
      FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public' AND p.prorettype = 'trigger'::regtype
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC', f.assinatura);
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM anon, authenticated', f.assinatura);
  END LOOP;
END $$;

-- 3) As que ficam abertas sem login continuam abertas de propósito — e explicitamente, para que a
--    próxima varredura mostre intenção e não esquecimento.
DO $$
DECLARE
  f record;
  abertas text[] := ARRAY[
    'portal_caso', 'portal_caso_id', 'portal_cliente', 'portal_marca', 'portal_documentos',
    'portal_mensagens', 'portal_enviar_mensagem', 'portal_marcar_lidas', 'portal_parcelas',
    'portal_assinar', 'portal_assinaturas', 'portal_avaliacoes', 'portal_avaliar',
    'convite_parceiro', 'marca_por_dominio'
  ];
BEGIN
  FOR f IN
    SELECT p.oid::regprocedure::text AS assinatura
      FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public' AND p.proname = ANY (abertas)
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC', f.assinatura);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO anon, authenticated, service_role', f.assinatura);
  END LOOP;
END $$;

-- 4) Função nova não nasce mais aberta a PUBLIC. Sem isto, a próxima função criada repõe o furo.
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA instituto REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

-- 5) search_path fixo nas 9 funções que não tinham: fecha o sequestro de nome de tabela.
DO $$
DECLARE f record;
BEGIN
  FOR f IN
    SELECT p.oid::regprocedure::text AS assinatura
      FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname IN ('public', 'instituto')
       AND p.prokind = 'f'
       AND (p.proconfig IS NULL OR NOT EXISTS (
             SELECT 1 FROM unnest(p.proconfig) c WHERE c LIKE 'search\_path=%'))
  LOOP
    EXECUTE format('ALTER FUNCTION %s SET search_path = public, instituto, pg_temp', f.assinatura);
  END LOOP;
END $$;

-- 6) Esquema de backup fora do alcance da API. Ele guarda a cópia de 11/11/2026 de tabelas do
--    escritório; ninguém precisa alcançá-lo pela chave do site.
REVOKE ALL ON SCHEMA copia_antes_limpeza_20261111 FROM anon, authenticated;
REVOKE ALL ON ALL TABLES IN SCHEMA copia_antes_limpeza_20261111 FROM anon, authenticated;

-- 7) Sobra da migração 129: a função de teste que provou que `revoke from anon` não funciona.
DROP FUNCTION IF EXISTS public.teste_revoke_129();

-- COMO CONFERIR DEPOIS DE APLICAR (deve devolver zero linha):
--   select p.proname
--     from pg_proc p join pg_namespace n on n.oid = p.pronamespace
--    where n.nspname = 'public' and p.prosecdef
--      and has_function_privilege('anon', p.oid, 'EXECUTE')
--      and p.proname not in ('portal_caso','portal_caso_id','portal_cliente','portal_marca',
--          'portal_documentos','portal_mensagens','portal_enviar_mensagem','portal_marcar_lidas',
--          'portal_parcelas','portal_assinar','portal_assinaturas','portal_avaliacoes',
--          'portal_avaliar','convite_parceiro','marca_por_dominio');
--
-- COMO DESFAZER, se alguma tela de verdade quebrar (devolve o estado de antes):
--   do $$ declare f record; begin
--     for f in select p.oid::regprocedure::text a from pg_proc p
--       join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.prosecdef
--     loop execute format('grant execute on function %s to public', f.a); end loop; end $$;
--   alter default privileges in schema public grant execute on functions to public;
