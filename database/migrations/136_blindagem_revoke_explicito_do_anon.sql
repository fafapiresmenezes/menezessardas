-- 136: termina o que a 135 começou. APLICADA em 13/11/2026 22:07 UTC.
--
-- Depois da 135, 52 funções ainda respondiam sem login, e 37 delas eram as `instituto_*`. Motivo:
-- essas tinham concessão EXPLÍCITA ao papel `anon`, e não só a herança de PUBLIC. `revoke … from
-- PUBLIC` não alcança concessão explícita. Faltava o revoke do próprio `anon`.
--
-- Vale como terceira regra do assunto, junto das duas que a 129 e a 135 deixaram:
--   1. `revoke … from anon` sozinho não resolve, porque a permissão costuma vir de PUBLIC;
--   2. `revoke … from PUBLIC` + `grant` para quem precisa resolve a herança;
--   3. e onde houver grant explícito a `anon`, precisa do revoke de `anon` TAMBÉM. Conferir pelo
--      `has_function_privilege('anon', oid, 'EXECUTE')` depois de aplicar, não pela intenção.
--
-- Aprovação: a mesma de M em 13/11/2026 22:02 UTC, cartão "Aplico agora a blindagem que fecha as
-- 110 funções do banco?", opção "Aplicar tudo agora". Só permissão; nenhum dado é tocado.
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
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM anon', f.assinatura);
    fechadas := fechadas + 1;
  END LOOP;
  RAISE NOTICE 'revogadas de anon: %', fechadas;
END $$;
