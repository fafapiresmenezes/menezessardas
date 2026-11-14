-- 129: as funções do banco que respondiam a quem não fez login param de responder.
--
-- Passo A28, segunda metade. O inventário de tabelas (database/A28-inventario-por-escritorio.md)
-- terminava dizendo que faltava auditar as funções `SECURITY DEFINER` uma por uma, porque uma função
-- dessas roda com os poderes de quem a definiu e por isso passa por cima de TODA política de tabela.
-- Foi onde estava o furo da migração 126. Esta migração fecha o resto.
--
-- O QUE FOI MEDIDO (13/11/2026, consultando o banco, não de memória):
--   - 177 funções `SECURITY DEFINER` no esquema `public`;
--   - 116 delas executáveis pelo papel `anon`, isto é, por qualquer pessoa com a chave pública do
--     site, SEM LOGIN. `anon` as alcança porque o Postgres concede EXECUTE a PUBLIC por padrão em
--     toda função nova, e `anon` herda de PUBLIC;
--   - dessas, 53 não mencionam `auth.uid()`, `eh_sede()`, `escritorio_atual()`, token nem segredo em
--     nenhum lugar do corpo: não têm tranca de espécie alguma.
--
-- Confirmado executando de verdade com `set role anon` e sem nenhum JWT: `instituto_pendencias()`
-- devolveu 7.251 caracteres, `instituto_okr()` 4.869, `instituto_placar_unico()` 3.327,
-- `instituto_cobertura()` 3.273, `instituto_negocio(30)` 3.157. Dentro vinham a regra de preço do
-- Instituto ("custo x 4"), o custo de infraestrutura, a série de receita por dia e a lista de
-- decisões pendentes. Nada disso é para a internet.
--
-- O ACHADO MAIS SÉRIO: `kyc_pendentes_reconsulta()` devolve CNPJ, nome e grau de risco de todas as
-- empresas que o escritório mandou checar, sem login nenhum. A tabela `checagens_kyc` é das mais
-- fechadas que existem (política RESTRICTIVE `so_sede_ate_separar`), e a função passava por cima
-- dela. Quem a chama é só `supabase/functions/kyc/index.ts`, com a chave de serviço.
--
-- COMO SE CONSERTA, SEM TOCAR EM NENHUM CORPO DE FUNÇÃO:
-- `revoke execute ... from public`, e depois `grant` para quem precisa. A nota da migração 126 diz
-- que mexer em privilégios não era possível aqui; aquilo estava errado, e vale registrar por quê:
-- o que eu havia tentado era `revoke ... from anon`, que não tem efeito nenhum, porque a permissão
-- não vem de uma concessão a `anon`, vem da concessão automática a PUBLIC. Conferido em 13/11/2026
-- numa função de teste criada e apagada para isto: `revoke from anon` deixou `anon` podendo
-- executar; `revoke from public` seguido de `grant to authenticated, service_role` deixou
-- `anon = false`, `authenticated = true`, `service_role = true`.
--
-- O QUE ESTA MIGRAÇÃO ESCOLHE FECHAR: só o "sem login". Quem pode ver entre as pessoas já logadas
-- — se é toda a plataforma ou só a sede — é decisão do M, em cartão próprio, e não mexo nisso de
-- madrugada. Por isso a maioria das funções abaixo continua aberta a `authenticated`.

-- 1) Só a chave de serviço. Nenhuma tela do site chama estas (procurado em src/, supabase/functions/
--    e scripts/); quem chama são robôs de servidor.
DO $$
DECLARE s text;
BEGIN
  FOREACH s IN ARRAY ARRAY[
    'kyc_pendentes_reconsulta()',        -- CNPJ, nome e risco das checagens: o achado mais sério
    'cruzar_novidades()',                -- disparava um trabalho de 200 linhas a pedido de qualquer um
    'cruzar_novidade(text)',
    'instituto_mercados(integer)'        -- só supabase/functions/mercados-predicao a usa
  ] LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%s FROM PUBLIC', s);
    EXECUTE format('GRANT EXECUTE ON FUNCTION public.%s TO service_role', s);
  END LOOP;
END $$;

-- 2) Precisa de login. Números de dentro da casa e do Instituto. Nenhuma tela as chama hoje, mas
--    deixo `authenticated` de propósito: fechar para a sede é decisão do M, não conserto meu.
DO $$
DECLARE s text;
BEGIN
  FOREACH s IN ARRAY ARRAY[
    'instituto_negocio(integer)', 'instituto_pendencias()', 'instituto_okr()',
    'instituto_b2b_resumo()', 'instituto_cobertura()', 'instituto_tracao_resumo(integer)',
    'instituto_vitais_resumo(integer)', 'instituto_slo(integer)', 'instituto_resumo_coleta()',
    'instituto_revisao_resumo()', 'instituto_injecao_resumo()', 'instituto_incidentes_resumo()',
    'instituto_grafo_resumo()', 'instituto_ultima_comparacao()', 'instituto_agentes_placar()',
    'instituto_coleta_sucesso(integer)', 'instituto_agente_roteiro(text)', 'instituto_enquetes()',
    'instituto_comarcas(text)', 'instituto_legislacao()', 'instituto_indices(integer)',
    'instituto_gdelt_indice(integer)',
    -- Estas três são de tela, chamadas por advogado logado em Indicadores e na calibragem:
    'taxa_util_assistente()', 'aderencia_consultores()', 'calibracao_previsoes()'
  ] LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%s FROM PUBLIC', s);
    EXECUTE format('GRANT EXECUTE ON FUNCTION public.%s TO authenticated, service_role', s);
  END LOOP;
END $$;

-- COMO CONFERIR DEPOIS DE APLICAR:
--   select p.proname,
--          has_function_privilege('anon', p.oid, 'EXECUTE') as anon,
--          has_function_privilege('authenticated', p.oid, 'EXECUTE') as logado,
--          has_function_privilege('service_role', p.oid, 'EXECUTE') as servico
--     from pg_proc p join pg_namespace n on n.oid = p.pronamespace
--    where n.nspname = 'public' and p.proname in ('kyc_pendentes_reconsulta','instituto_pendencias',
--          'instituto_negocio','taxa_util_assistente','cruzar_novidades')
--    order by 1;
--   -- `anon` tem de ser false em todas; `servico` true em todas.

-- O QUE ESTA MIGRAÇÃO DE PROPÓSITO NÃO FECHA, E POR QUÊ -------------------------------------------
--
-- 1. `marca_escritorio(uuid)` e `marca_por_dominio(text)` devolvem nome, cor e logo do escritório.
--    Isso é público por desenho: a tela de login precisa saber de que escritório ela é ANTES de
--    alguém entrar. Fica aberto.
--
-- 2. `instituto_api_cadastrar`, `instituto_relatar_incidente`, `instituto_tracao_evento`,
--    `instituto_vitais` e `instituto_relatorio_prova` são portas de entrada públicas de propósito
--    (cadastro de teste da API, relato de erro de agente, contagem de visita, medição de
--    desempenho, conferência de uma prova por sha). Todas já têm limite diário escrito dentro delas.
--
-- 3. `instituto_opcoes()`, `instituto_agentes_lista()`, `instituto_agentes_custo()`,
--    `instituto_placar_unico()`, `instituto_motor_resumo()` e `instituto_chance_classes()` são
--    chamadas por `instituto-agentes`, `instituto-acesso` e pelo site com a chave pública. Fechar
--    estas exige mexer em como essas funções de servidor pedem, e isso é mudança de código, não de
--    privilégio. Ficam anotadas como o que sobrou.
--
-- 4. As funções de GATILHO que apareceram na lista — `bloqueia_cadastro_fechado`,
--    `intimacao_cria_tarefa`, `conciliar_honorarios`, `avaliacoes_portal_escritorio`,
--    `estilos_limite`, `notif_fatura`, `notif_intimacao`, `notif_novidade`, `notif_tarefa`,
--    `reabrir_parcela_ao_apagar_pagamento`, `definir_escritorio_do_registro`,
--    `trg_cruzar_novidade_fn` — não são furo: o Postgres recusa chamar uma função de gatilho
--    direto. Conferido lendo o corpo de cada uma: todas usam NEW/OLD.
--
-- 5. As funções `portal_*` pedem `p_token`: são o portal do cliente, que entra por link e não por
--    senha. É o desenho, e o token é a tranca.
--
-- ESTADO: ESCRITA, NÃO APLICADA. Mexe em permissão de objeto vivo, então espera o toque de M.
