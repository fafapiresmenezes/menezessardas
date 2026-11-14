-- 137: as últimas 16. APLICADA em 13/11/2026 22:08 UTC.
--
-- Depois da 136 sobraram 16 funções alcançáveis sem login. Quinze rodam com o poder de QUEM CHAMA
-- (SECURITY INVOKER), então a política de tabela já barrava o visitante — risco pequeno, mas
-- superfície sem motivo. A exceção era `instituto.metricas_locacao`, que roda com o poder do
-- criador e por isso passava por cima de política: essa era furo de verdade, e tinha ficado de fora
-- da 135 porque a 135 só percorreu o esquema `public`.
--
-- Em todas: revoke de PUBLIC, grant para quem está logado e para a chave de serviço, revoke de anon.
--
-- Aprovação: a mesma de M de 13/11/2026 22:02 UTC. Só permissão; nenhum dado.
--
-- ESTADO DEPOIS DAS TRÊS (conferido no banco, não pela intenção):
--   funções alcançáveis sem login: 15, exatamente as da lista `abertas` (portal do cliente por
--     token, convite por token e a marca do escritório na tela de entrada);
--   funções sem search_path fixo em public e instituto: 0;
--   esquema de backup copia_antes_limpeza_20261111: fora do alcance de anon E de quem está logado;
--   funções que quem está logado perdeu: nenhuma (as 15 do esquema instituto que aparecem sem
--     acesso para `authenticated` já estavam assim antes, são de robô com chave de serviço).
--   Teste real com `set role anon`: marca_por_dominio responde, portal_caso responde (nulo para
--     token inexistente), instituto_okr responde "permission denied".
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
    SELECT p.oid::regprocedure::text AS assinatura
      FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname IN ('public', 'instituto')
       AND NOT (p.proname = ANY (abertas))
       AND has_function_privilege('anon', p.oid, 'EXECUTE')
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC', f.assinatura);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated, service_role', f.assinatura);
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM anon', f.assinatura);
    fechadas := fechadas + 1;
  END LOOP;
  RAISE NOTICE 'fechadas: %', fechadas;
END $$;
