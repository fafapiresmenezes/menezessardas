-- 139: a tabela do placar do Instituto para de ser lida sem login.
--
-- Achado em 13/11/2026 22h20, na sonda que roda como visitante sem conta (`set role anon`) e conta
-- as linhas de toda tabela alcançável. Depois das migrações 135 a 137, sobraram exatamente duas
-- tabelas que o visitante consegue ler: `public.centros_custo_nicho` (que a migração 128 fecha) e
-- esta, `instituto.placar_protocolos`, com 4 linhas.
--
-- O que há nela: o placar de acerto do motor de previsão — Brier do modelo, Brier da linha de base,
-- veredito. Nada de cliente e nada de processo. O que incomoda é o campo `origem`, que diz em que
-- pasta do computador de M o dado foi colhido, e o hábito: tabela aberta por descuido é tabela
-- aberta, e amanhã alguém escreve nela um dado que importa.
--
-- POR QUE FECHAR NÃO QUEBRA A TELA: o placar não é lido direto da tabela pelo site. Ele vem da
-- função `public.instituto_placar_unico()`, que é SECURITY DEFINER e por isso continua lendo a
-- tabela com os poderes de quem a definiu. Essa função deixou de responder sem login nas migrações
-- 135 a 137, de propósito: o placar é tela de dentro. A política abaixo, portanto, só retira um
-- caminho que ninguém usava.
--
-- O `grant` original dizia `to anon, authenticated` (migração U12, do placar único). Esta migração
-- não mexe no grant da função, mexe na política da tabela: quem está logado continua lendo.
DROP POLICY IF EXISTS placar_leitura_publica ON instituto.placar_protocolos;

CREATE POLICY placar_leitura_publica ON instituto.placar_protocolos
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (true);

-- COMO CONFERIR DEPOIS DE APLICAR:
--   set role anon;  select count(*) from instituto.placar_protocolos;   -- 0
--   reset role;     select count(*) from instituto.placar_protocolos;   -- 4
--   -- e, com a credencial de alguém logado, a tela do placar continua montando.
--
-- ESTADO: ESCRITA, NÃO APLICADA. Mexe em política que já existe, então espera o toque de M.
