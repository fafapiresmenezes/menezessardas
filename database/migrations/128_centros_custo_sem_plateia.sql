-- 128: receita, custo e saldo do Instituto param de ficar abertos para qualquer um.
--
-- Achado em 13/11/2026, ao fechar o inventário do passo A28 (quais tabelas ainda são vistas por
-- escritório errado). Esta não é um problema entre escritórios: é um problema de plateia.
--
-- A tabela `public.centros_custo_nicho` guarda, por nicho e por período, `receita_total`,
-- `custo_total` e `saldo` — o resultado financeiro do Instituto. A única política dela é:
--
--     centros_custo_leitura  SELECT  PERMISSIVE  USING (true)
--
-- `USING (true)`, somado ao `SELECT` concedido ao papel `anon`, significa que qualquer pessoa com a
-- chave pública da plataforma — que viaja dentro do site e, por desenho, é pública — pode ler esses
-- números SEM FAZER LOGIN. Conferido em 13/11/2026: `has_table_privilege('anon', …, 'SELECT')` é
-- verdadeiro e a tabela tinha 4 linhas.
--
-- É o mesmo desenho que a migração 126 fecha na função `semana_agenda`, por outro caminho: uma
-- permissão escrita para "a plataforma inteira lê" que na prática quis dizer "a internet lê".
--
-- O que esta migração faz: troca o `true` por "quem está logado na sede". A tabela é da
-- administração do Instituto.
--
-- DE ONDE ELA VEIO: a tabela foi criada em 08/11/2026 pela migração `centros_custo_nicho`
-- (versão 20261108135410), de outra frente de trabalho — o plano do nicho de locação. Procurei
-- `centros_custo_nicho` no repositório inteiro, site e funções de servidor: **nenhum arquivo do
-- código a lê**. Quem a lê hoje faz isso por SQL direto ou com a chave de serviço, que passa por
-- cima de qualquer política e não é afetada por esta migração.
--
-- O QUE PODE QUEBRAR: se alguma rotina de fora do repositório estiver lendo esta tabela com a
-- chave pública (`anon`) em vez da chave de serviço, ela passa a receber lista vazia. Não achei
-- nenhuma, mas quem escreveu a frente do nicho de locação sabe melhor do que eu.

DROP POLICY IF EXISTS centros_custo_leitura ON public.centros_custo_nicho;

CREATE POLICY centros_custo_leitura ON public.centros_custo_nicho
  AS PERMISSIVE FOR SELECT TO public
  USING (public.eh_sede());

-- COMO CONFERIR DEPOIS DE APLICAR:
--   -- sem sessão (papel anon), deve voltar zero linha:
--   select count(*) from public.centros_custo_nicho;
--   -- com a credencial de alguém da sede, deve voltar as linhas de sempre.
--
-- ESTADO: ESCRITA, NÃO APLICADA. Mexe em política que já existe, então espera o toque de M.
