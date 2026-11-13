-- 127: as cinco tabelas que têm a coluna do escritório e ninguém lia essa coluna.
--
-- Passo A28. Esta migração SUBSTITUI o arquivo 127_escritorio_11_tabelas.sql, que eu havia escrito
-- com uma conta errada e que foi apagado. Fica aqui dito o que estava errado, porque a diferença é
-- justamente o que importa:
--
--   Eu havia listado 11 tabelas como "têm `escritorio_id` e nenhuma política lendo essa coluna".
--   Ao fechar o inventário (database/A28-inventario-por-escritorio.md), com uma consulta que
--   procura `escritorio_id`, `escritorio_atual` e `eh_sede` dentro do texto de cada política, só
--   CINCO são assim. As outras seis já tinham política lendo o escritório — e, pior, uma política
--   RESTRICTIVE chamada `so_sede_ate_separar` (ou `sede_only`), que diz `eh_sede()`: nelas, quem
--   não é da sede não vê NADA, nem o que é do próprio escritório. Acrescentar ali a política desta
--   migração não teria efeito nenhum, porque políticas RESTRICTIVE se somam com E, e
--   `eh_sede() AND (eh_sede() OR ...)` continua sendo `eh_sede()`.
--
-- As cinco de verdade:
--   alertas_tratados, avaliacoes_sus, buscas_salvas, consultas_juridicas, pedidos_entrada
--
-- Uma observação sobre `pedidos_entrada`: ela hoje não tem política NENHUMA, e por isso ninguém a
-- lê pela chave pública; quem a usa são funções de servidor. Uma política RESTRICTIVE nunca dá
-- acesso, só restringe, de modo que acrescentá-la ali não abre nem fecha nada hoje — fica como
-- rede para o dia em que alguém escrever a política que dá acesso.
--
-- Conferido em 13/11/2026, antes de escrever: nenhuma delas tem linha com `escritorio_id` nulo
--   alertas_tratados 0 linhas, avaliacoes_sus 1, buscas_salvas 0, consultas_juridicas 25,
--   pedidos_entrada 0 — todas com escritório preenchido.
-- Portanto aplicar isto NÃO esconde nada do que a Dra. Fátima vê hoje: a sede continua vendo tudo
-- (por `eh_sede()`), e cada escritório passa a ver o que é dele.
--
-- Só acrescenta: nenhuma política existente é alterada ou removida. RESTRICTIVE se soma às regras
-- que já existem, inclusive às regras por pessoa das migrações 124 e 125. O resultado nas tabelas
-- que têm as duas é "o meu, dentro do meu escritório".

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'alertas_tratados', 'avaliacoes_sus', 'buscas_salvas', 'consultas_juridicas', 'pedidos_entrada'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS so_meu_escritorio_%s ON public.%I', t, t);
    EXECUTE format(
      'CREATE POLICY so_meu_escritorio_%s ON public.%I AS RESTRICTIVE FOR SELECT TO public '
      'USING (public.eh_sede() OR escritorio_id = public.escritorio_atual())', t, t);
  END LOOP;
END $$;

-- COMO CONFERIR DEPOIS DE APLICAR:
--   select tablename, policyname, permissive from pg_policies
--    where schemaname = 'public' and policyname like 'so_meu_escritorio_%' order by 1;
--   -- deve listar as cinco, todas RESTRICTIVE.

-- O QUE ESTA MIGRAÇÃO DE PROPÓSITO NÃO FAZ ---------------------------------------------------------
--
-- 1. `public.eh_sede()` continua deixando a sede ver todos os escritórios. É desenho antigo da
--    plataforma e decisão do M, não defeito; não mexo nisso aqui.
--
-- 2. As seis tabelas trancadas em `eh_sede()` — alertas, intimacoes, analises_contratos,
--    analises_contrato, checagens_kyc, convites_escritorio — continuam como estão. O nome da
--    política, `so_sede_ate_separar`, diz que era provisório "até separar", e a separação por
--    escritório já está no ar desde as migrações 116 e 117. Quer dizer: hoje um escritório
--    parceiro NÃO VÊ as próprias intimações, os próprios alertas e as próprias análises de
--    contrato. Abrir isso é trocar `eh_sede()` por `eh_sede() OR escritorio_id =
--    public.escritorio_atual()` em cada uma delas, e **muda o que o escritório que comprou a
--    plataforma pode fazer**. Isso é decisão do M, em cartão próprio, não um conserto que eu
--    aplique de madrugada.
--
-- ESTADO: ESCRITA, NÃO APLICADA. Mexe em tabela viva, então espera o toque de M.
