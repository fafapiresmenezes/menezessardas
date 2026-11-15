-- 138: tira do visitante sem conta a função `semana_agenda_completa`, criada pela 126.
--
-- O QUE ACONTECEU, E QUE VALE GUARDAR
--
-- A 126 criou a `semana_agenda_completa` contando com o que a 135 havia feito: `alter default
-- privileges in schema public revoke execute on functions from public`, para que função nova não
-- nascesse aberta. Conferindo depois de aplicar, a função nasceu assim:
--
--   {=X/postgres, postgres=X/postgres, authenticated=X/postgres, service_role=X/postgres}
--
-- O primeiro item, `=X/postgres`, é a concessão a PUBLIC, e `anon` herda de PUBLIC. Quer dizer: o
-- privilégio padrão que a 135 ajustou NÃO foi respeitado na criação. O `pg_default_acl` do papel
-- `postgres` no esquema `public` mostra, sim, apenas `postgres`, `authenticated` e `service_role` —
-- e mesmo assim PUBLIC apareceu. Existe, portanto, algo neste banco (um gatilho de evento da
-- plataforma, ou o papel que de fato executa a migração) que repõe a concessão a PUBLIC em função
-- nova, por fora do privilégio padrão.
--
-- LIÇÃO: neste banco, `alter default privileges` não é garantia. **Toda função nova precisa do seu
-- próprio `revoke execute from public`**, escrito na mesma migração que a cria, e precisa ser
-- conferida depois por `has_function_privilege('anon', ..., 'EXECUTE')`. A 135 continua valendo como
-- cinto, mas não serve de suspensório.
--
-- O risco concreto enquanto isso durou: a visão do escritório inteiro ficou alcançável pela chave
-- pública do site. Ela é trancada por segredo (`configuracoes.cron_segredo`), e sem o segredo
-- devolve `{"erro":"segredo invalido"}`, então nenhum prazo escapou. Mesmo assim, uma tranca só é
-- tranca quando são duas: a permissão E o segredo.
REVOKE EXECUTE ON FUNCTION public.semana_agenda_completa(text, date, integer, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.semana_agenda_completa(text, date, integer, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.semana_agenda_completa(text, date, integer, uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.semana_agenda_completa(text, date, integer, uuid) TO service_role;

-- COMO CONFERIR DEPOIS DE APLICAR (tem de vir false, false, true):
--   select has_function_privilege('anon','public.semana_agenda_completa(text,date,integer,uuid)','EXECUTE'),
--          has_function_privilege('authenticated','public.semana_agenda_completa(text,date,integer,uuid)','EXECUTE'),
--          has_function_privilege('service_role','public.semana_agenda_completa(text,date,integer,uuid)','EXECUTE');
