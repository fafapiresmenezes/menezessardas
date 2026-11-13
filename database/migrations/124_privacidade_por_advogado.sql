-- 124 — Privacidade por advogado no BANCO (pedido do M: "cada advogado só vê o seu, exceto sócios/gestor").
--
-- ATENÇÃO: ESTA MIGRAÇÃO NÃO FOI APLICADA. Depende da autorização do M antes de ir ao banco de produção,
-- porque ela ESCONDE linhas de quem hoje as lê. Aplicar sem nomear a hierarquia (configuracoes.cargos)
-- deixa TODA a equipe, inclusive os sócios, vendo só os próprios processos — o que é seguro, mas incomoda.
-- Ordem recomendada: 1) nomear gestor e sócios na tela Equipe; 2) conferir que cada caso tem responsável
-- (tela Carteira de processos, coluna Responsável); 3) aplicar esta migração; 4) reconferir as telas.
--
-- O QUE ESTA MIGRAÇÃO CONSERTA
-- Hoje a privacidade por advogado existe só no NAVEGADOR: as telas (Carteira de processos, Meu dia, Casos,
-- Horas, Honorários, Relatórios, Intimações) pedem as linhas do escritório inteiro e escondem as dos colegas
-- com as funções de src/lib/hierarquia.ts. Quem souber usar a API do Supabase com a própria credencial lê
-- tudo do escritório: as políticas de hoje param no "é da equipe?" (perfil_atual() não nulo) e no escritório
-- (migrações 116 a 120). Ou seja: a separação ENTRE escritórios é real; a separação ENTRE advogados do mesmo
-- escritório, não. Esta migração torna a segunda real, sem tocar na primeira.
--
-- COMO: políticas RESTRITIVAS de SELECT (somam-se às existentes, nunca substituem) usando o cargo do
-- escritório. Só acrescenta; para voltar atrás basta remover as políticas com nome `so_meu_*`.
-- Leitura; a gravação fica como está, para a equipe continuar criando e assumindo processos sem dono.

-- 1. Cargo de quem está logado, lido de configuracoes.cargos do próprio escritório -----------------
CREATE OR REPLACE FUNCTION public.meu_cargo()
RETURNS text LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_mapa jsonb; v_cargo text;
BEGIN
  IF auth.uid() IS NULL THEN RETURN NULL; END IF;
  SELECT c.valor::jsonb INTO v_mapa FROM public.configuracoes c
    WHERE c.chave = interno.config_chave_do_escritorio('cargos');
  IF v_mapa IS NULL THEN RETURN NULL; END IF;
  v_cargo := v_mapa->>auth.uid()::text;
  IF v_cargo IN ('socio', 'gestor', 'pleno', 'junior') THEN RETURN v_cargo; END IF;
  RETURN NULL;
EXCEPTION WHEN others THEN RETURN NULL; -- mapa de cargos inválido: vale o alcance mais estreito
END $$;

-- Sócio, gestor e a administração do escritório veem o conjunto. Sem cargo definido: só o que é seu.
CREATE OR REPLACE FUNCTION public.ve_tudo_no_escritorio()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT auth.uid() IS NOT NULL
     AND (public.meu_cargo() IN ('socio', 'gestor') OR public.perfil_atual() = 'admin'::usuario_funcao)
$$;

-- Item sem dono aparece para todos: alguém precisa assumi-lo (mesma regra de podeVer em hierarquia.ts).
CREATE OR REPLACE FUNCTION public.pode_ver_dono(p_dono uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT auth.uid() IS NOT NULL AND (p_dono IS NULL OR p_dono = auth.uid() OR public.ve_tudo_no_escritorio())
$$;

-- Intimações e monitoramentos não têm dono: o dono é o do caso com aquele número de processo.
CREATE OR REPLACE FUNCTION public.pode_ver_processo(p_numero text)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_dig text; v_tem boolean; v_meu boolean;
BEGIN
  IF auth.uid() IS NULL THEN RETURN false; END IF;
  IF public.ve_tudo_no_escritorio() THEN RETURN true; END IF;
  v_dig := regexp_replace(coalesce(p_numero, ''), '\D', '', 'g');
  IF v_dig = '' THEN RETURN true; END IF;
  SELECT EXISTS (SELECT 1 FROM public.tarefas t
                  WHERE regexp_replace(coalesce(t.numero_processo, ''), '\D', '', 'g') = v_dig
                    AND t.responsavel_id IS NOT NULL),
         EXISTS (SELECT 1 FROM public.tarefas t
                  WHERE regexp_replace(coalesce(t.numero_processo, ''), '\D', '', 'g') = v_dig
                    AND t.responsavel_id = auth.uid())
    INTO v_tem, v_meu;
  RETURN v_meu OR NOT v_tem; -- processo que ainda não é caso de ninguém continua visível
END $$;

-- 2. Políticas restritivas de leitura -------------------------------------------------------------
-- Cada bloco só cria a política se a tabela e a coluna de dono existirem e a política ainda não existir.
DO $$
DECLARE
  r record;
  -- tabela, coluna que guarda o dono
  v_donos text[][] := ARRAY[
    ['tarefas', 'responsavel_id'],            -- casos, prazos e tarefas
    ['lancamentos_horas', 'usuario_id'],      -- horas trabalhadas
    ['biblioteca_pesquisas', 'criado_por'],   -- biblioteca de pesquisa
    ['perfis_cliente', 'criado_por'],         -- perfil do cliente
    ['checagens_kyc', 'usuario_id'],          -- checagem de contraparte
    ['consultas_juridicas', 'usuario_id'],    -- consultas ao assistente
    ['buscas_salvas', 'usuario_id']           -- buscas guardadas
  ];
  i int;
BEGIN
  FOR i IN 1 .. array_length(v_donos, 1) LOOP
    SELECT v_donos[i][1] AS tabela, v_donos[i][2] AS coluna INTO r;
    IF EXISTS (SELECT 1 FROM information_schema.columns
                WHERE table_schema = 'public' AND table_name = r.tabela AND column_name = r.coluna)
       AND NOT EXISTS (SELECT 1 FROM pg_policies
                        WHERE schemaname = 'public' AND tablename = r.tabela AND policyname = 'so_meu_' || r.tabela) THEN
      EXECUTE format('CREATE POLICY %I ON public.%I AS RESTRICTIVE FOR SELECT TO public USING (public.pode_ver_dono(%I))',
                     'so_meu_' || r.tabela, r.tabela, r.coluna);
    END IF;
  END LOOP;
END $$;

-- Intimações e monitoramentos: pelo dono do caso daquele número de processo.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'intimacoes' AND column_name = 'numero_processo')
     AND NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'intimacoes' AND policyname = 'so_meu_intimacoes') THEN
    CREATE POLICY so_meu_intimacoes ON public.intimacoes AS RESTRICTIVE FOR SELECT TO public
      USING (public.pode_ver_processo(numero_processo));
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'monitoramentos' AND column_name = 'valor')
     AND NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'monitoramentos' AND policyname = 'so_meu_monitoramentos') THEN
    CREATE POLICY so_meu_monitoramentos ON public.monitoramentos AS RESTRICTIVE FOR SELECT TO public
      USING (tipo <> 'processo' OR public.pode_ver_processo(valor));
  END IF;
END $$;

-- Honorários: o dinheiro segue o caso (pagamentos e parcelas apontam para o caso em tarefas).
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['pagamentos_honorarios', 'parcelas_honorarios'] LOOP
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = t AND column_name = 'caso_id')
       AND NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = t AND policyname = 'so_meu_' || t) THEN
      EXECUTE format($f$CREATE POLICY %I ON public.%I AS RESTRICTIVE FOR SELECT TO public
        USING (public.ve_tudo_no_escritorio() OR EXISTS (
          SELECT 1 FROM public.tarefas c WHERE c.id = caso_id
            AND (c.responsavel_id IS NULL OR c.responsavel_id = auth.uid())))$f$, 'so_meu_' || t, t);
    END IF;
  END LOOP;
END $$;

-- 3. Índices que estas políticas usam ------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_tarefas_responsavel ON public.tarefas(responsavel_id);

-- COMO CONFERIR DEPOIS DE APLICAR (com a credencial de um advogado pleno, não a de serviço):
--   select count(*) from tarefas;                 -- só os casos dele e os sem dono
--   select public.meu_cargo(), public.ve_tudo_no_escritorio();
-- E com a de um sócio nomeado: as duas contagens voltam ao total do escritório.
