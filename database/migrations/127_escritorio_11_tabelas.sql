-- 127 — ESCRITA, NÃO APLICADA. Espera o toque de M no cartão (o verificador que me cerca recusa
-- mexer em tabela que já existe sem isso). Fecha por escritório as 11 tabelas que já tinham a coluna
-- e não tinham a tranca (passo A28).
--
-- O que foi conferido no banco em 13/11/2026: das 96 tabelas do schema `public`, 41 têm a coluna
-- `escritorio_id`, mas só 34 tinham alguma política que a usasse. Sobravam 11 tabelas com a coluna
-- preenchida e nenhuma política lendo ela. Quer dizer: se um segundo escritório entrar na plataforma
-- hoje, nessas 11 tabelas os dois escritórios se veem.
--
-- Isso importa agora, e não depois, porque a plataforma já está vendida para outro escritório. Antes
-- de a primeira pessoa de fora entrar, essas 11 portas precisam estar fechadas.
--
-- As 11 (com o que havia nelas hoje):
--   consultas_juridicas (25)  checagens_kyc (8)   alertas (6)       analises_contratos (2)
--   analises_contrato (1)     avaliacoes_sus (1)  convites_escritorio (1)
--   alertas_tratados (0)      buscas_salvas (0)   intimacoes (0)    pedidos_entrada (0)
--
-- NENHUMA delas tem linha com `escritorio_id` nulo — conferido uma a uma antes de escrever isto. Por
-- isso a tranca não esconde nada do que o escritório já tem: hoje ela não muda uma única linha do que
-- a Dra. Fátima vê. Ela só passa a valer quando houver um segundo escritório.
--
-- A regra é a mesma que as outras 34 tabelas já usam, para não inventar um segundo jeito de pensar:
--   eh_sede() OR escritorio_id = escritorio_atual()
-- RESTRICTIVE, e só para SELECT: política restritiva se soma às que já existem e só pode fechar
-- acesso, nunca abrir. As políticas de escrita de cada tabela ficam como estão.
--
-- O que esta migração NÃO resolve, e fica dito: `eh_sede()` continua deixando a sede ver o dado de
-- todo escritório. É o desenho que a plataforma já tinha, e vale para as 34 tabelas anteriores do
-- mesmo jeito. Se o escritório comprador precisar de sigilo também diante da sede, isso é outra
-- decisão, de M, e outra migração.
--
-- Faltam ainda as tabelas que não têm a coluna `escritorio_id`. Elas se dividem em três casos e cada
-- um pede tratamento diferente, então ficam para um passo próprio: acervo comum da casa
-- (leis_texto, modelos_locacao, normas_monitoradas), coisa de uma pessoa só já trancada por
-- `usuario_id` (preferencias_usuario, push_*, ordem_tarefas_pessoal), e as que são da plataforma
-- inteira e não de escritório nenhum (saude_sistema, consumo_api, precos_api, selos_blockchain).
--
-- SEGURO DE RODAR DUAS VEZES: cada tabela só recebe a política se ainda não tiver uma com esse nome.

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'consultas_juridicas', 'checagens_kyc', 'alertas', 'analises_contratos', 'analises_contrato',
    'avaliacoes_sus', 'convites_escritorio', 'alertas_tratados', 'buscas_salvas', 'intimacoes',
    'pedidos_entrada'
  ] LOOP
    IF EXISTS (SELECT 1 FROM information_schema.columns
                WHERE table_schema = 'public' AND table_name = t AND column_name = 'escritorio_id')
       AND NOT EXISTS (SELECT 1 FROM pg_policies
                WHERE schemaname = 'public' AND tablename = t AND policyname = 'so_meu_escritorio_' || t) THEN
      EXECUTE format(
        $f$CREATE POLICY %I ON public.%I AS RESTRICTIVE FOR SELECT TO public
             USING (public.eh_sede() OR escritorio_id = public.escritorio_atual())$f$,
        'so_meu_escritorio_' || t, t);
    END IF;
  END LOOP;
END $$;

-- COMO CONFERIR DEPOIS DE APLICAR:
--   -- as 11 passam a aparecer aqui, como RESTRICTIVE
--   select tablename, policyname from pg_policies
--    where schemaname='public' and policyname like 'so_meu_escritorio_%' order by tablename;
--   -- e, com a credencial da Dra. Fátima, as contagens continuam as mesmas de antes:
--   select count(*) from consultas_juridicas;   -- 25
--   select count(*) from checagens_kyc;         -- 8
--   select count(*) from alertas;               -- 6
