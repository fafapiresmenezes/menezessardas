-- 125 — APLICADA em producao em 13/11/2026, apos o toque de M no cartao.
--
-- Completa a privacidade por advogado onde a 124 deixou buraco.
--
-- Por que uma migração nova e não um remendo na 124: a 124 já estava APLICADA em produção
-- (13/11/2026). O arquivo dela descreve o que o banco tem hoje e por isso não se mexe mais nele.
-- Tudo o que vem depois entra aqui.
--
-- Duas coisas:
--
-- 1. MONITORAMENTO POR NOME. A 124 escondeu o monitoramento de PROCESSO pelo dono do caso, mas
--    deixou o monitoramento de NOME (cliente ou contraparte) à vista de todo mundo, porque não há
--    processo a que ligá-lo. Quem cadastra um nome para vigiar está dizendo de quem é o caso dele;
--    o colega não precisa ver. Agora vale quem cadastrou (`criado_por`). Monitoramento antigo, sem
--    autor registrado, continua à vista de todos — esconder o que já existe sem saber de quem é
--    tiraria da pessoa certa o que é dela.
--
-- 2. DIAGNÓSTICO DE COMPLIANCE. Segue o dono do caso (o plano de ação aberto com ele). Diagnóstico
--    sem caso continua à vista de todos.
--
-- Nos dois casos a regra é a mesma que a tela aplica no navegador. Sócio, gestor e admin continuam
-- vendo tudo, por `public.ve_tudo_no_escritorio()`.
--
-- SEGURO DE RODAR DUAS VEZES: cada bloco confere antes de criar.

-- 1. Monitoramento por nome ----------------------------------------------------------------------
-- A política de monitoramentos precisa ser REFEITA, não só criada: a 124 já deixou uma com este
-- nome, mais larga. Trocar uma política RESTRICTIVE por outra mais estreita só fecha acesso.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
              WHERE table_schema = 'public' AND table_name = 'monitoramentos' AND column_name = 'valor')
     AND EXISTS (SELECT 1 FROM information_schema.columns
              WHERE table_schema = 'public' AND table_name = 'monitoramentos' AND column_name = 'criado_por') THEN
    DROP POLICY IF EXISTS so_meu_monitoramentos ON public.monitoramentos;
    CREATE POLICY so_meu_monitoramentos ON public.monitoramentos AS RESTRICTIVE FOR SELECT TO public
      USING (CASE WHEN tipo = 'processo'
                  THEN public.pode_ver_processo(valor)
                  ELSE public.pode_ver_dono(criado_por) END);
  END IF;
END $$;

-- 2. Diagnósticos de compliance -----------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
              WHERE table_schema = 'public' AND table_name = 'diagnosticos_compliance' AND column_name = 'caso_id')
     AND NOT EXISTS (SELECT 1 FROM pg_policies
              WHERE schemaname = 'public' AND tablename = 'diagnosticos_compliance'
                AND policyname = 'so_meu_diagnosticos_compliance') THEN
    CREATE POLICY so_meu_diagnosticos_compliance ON public.diagnosticos_compliance AS RESTRICTIVE FOR SELECT TO public
      USING (public.ve_tudo_no_escritorio() OR caso_id IS NULL OR EXISTS (
        SELECT 1 FROM public.tarefas c WHERE c.id = caso_id
          AND (c.responsavel_id IS NULL OR c.responsavel_id = auth.uid())));
  END IF;
END $$;

-- O QUE ESTA MIGRAÇÃO DE PROPÓSITO NÃO ESCONDE ---------------------------------------------------
-- `compromissos` (vencimentos de contrato, reajustes, vistorias, eventos importados do .ics): é a
-- agenda comum da carteira de locação, não tem advogado dono e vale para o escritório inteiro.
-- `imoveis`, `contratos`, `modelos` e a legislação acompanhada: acervo comum da casa.
--
-- AINDA FALTA, FORA DO ALCANCE DESTA MIGRAÇÃO ----------------------------------------------------
-- A função `semana_agenda` (o PDF "Semana em PDF" da tela Agenda, e o e-mail de sexta à secretaria)
-- monta a lista DENTRO do banco, com os poderes de quem a definiu, e por isso não passa pelo filtro
-- do navegador nem por estas políticas: hoje ela devolve a semana do escritório inteiro a quem a
-- chama. Precisa filtrar `tarefas` por `public.pode_ver_dono(t.responsavel_id)`, senão o PDF
-- continua entregando ao júnior os prazos dos colegas. O mesmo vale para a função do resumo semanal
-- por e-mail. Isso muda uma função que já existe, então é uma migração à parte, com o toque de M.

-- COMO CONFERIR DEPOIS DE APLICAR (com a credencial de um advogado pleno, não a de serviço):
--   select count(*) from monitoramentos;           -- só os dele e os sem autor
--   select count(*) from diagnosticos_compliance;  -- só os dos casos dele e os sem caso
