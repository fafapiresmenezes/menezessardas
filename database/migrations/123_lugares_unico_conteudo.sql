-- 123 — NÃO APLICADA. Depende de aprovação do dono do banco.
--
-- Achado do passo C2 (ingestão do GDELT). O arquivo 122 diz, no comentário de desenho nº 3, que
-- toda linha das quatro tabelas carrega "um hash do próprio conteúdo, para a ingestão ser
-- idempotente". Mas o índice que faz valer essa promessa só foi criado como ÚNICO em duas delas:
--
--   instituto.eventos   -> eventos_fonte_hash_idx   é UNIQUE  ✔
--   instituto.arestas   -> arestas_fonte_hash_idx   é UNIQUE  ✔
--   instituto.entidades -> entidades_fonte_hash_idx NÃO é unique (a unicidade vem de
--                          entidades_chave_idx, em (tipo, chave_natural); está coberto)
--   instituto.lugares   -> lugares_fonte_hash_idx   NÃO é unique, e o único que existe é em
--                          codigo_ibge, que o GDELT nunca fornece. Um ponto geográfico vindo do
--                          GDELT, portanto, não tem como ser gravado com "on conflict do nothing".
--
-- Consequência prática hoje: a função gdelt-coleta não consegue confiar no banco para o ponto
-- geográfico. Ela procura pelo par (fonte, conteudo_hash) e insere só o que falta. Isso é
-- idempotente entre execuções sequenciais, que é o caso do pg_cron, mas não impede duas
-- execuções simultâneas de criarem dois lugares idênticos.
--
-- O que esta migração faz: cria o índice único que falta, deixando lugares igual a eventos e
-- arestas. Depois de aplicada, a gdelt-coleta pode trocar a leitura prévia por um
-- upsert com onConflict 'fonte,conteudo_hash' e ignoreDuplicates — menos uma ida ao banco por
-- bloco e segurança contra concorrência.
--
-- ANTES DE APLICAR: se já houver linhas duplicadas em (fonte, conteudo_hash), o CREATE UNIQUE
-- INDEX falha. A consulta de conferência está no fim do arquivo. Em 13/11/2026 a tabela
-- instituto.lugares não tinha duplicata.
--
-- Só acrescenta: nenhuma tabela, coluna ou política existente é alterada ou removida.

create unique index if not exists lugares_fonte_hash_uidx
  on instituto.lugares (fonte, conteudo_hash);

-- O índice não único antigo fica onde está: cobre o mesmo par e remover índice não é "só
-- acrescentar". Quem quiser limpar depois, em migração separada:
--   drop index if exists instituto.lugares_fonte_hash_idx;

-- Conferência antes de aplicar (deve devolver zero linhas):
--   select fonte, conteudo_hash, count(*)
--   from instituto.lugares group by 1, 2 having count(*) > 1;
