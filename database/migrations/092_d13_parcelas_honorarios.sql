-- Passo D13 (Diamante): parcelas de honorários por caso, com vencimento, situação paga/aberta,
-- PIX por parcela (QR com o valor da parcela) e lembrete no resumo semanal por e-mail.
-- Idempotente.
CREATE TABLE IF NOT EXISTS public.parcelas_honorarios (
  id bigserial PRIMARY KEY,
  caso_id uuid NOT NULL REFERENCES public.tarefas(id) ON DELETE CASCADE,
  numero integer NOT NULL CHECK (numero > 0),
  vencimento date NOT NULL,
  valor numeric(14,2) NOT NULL CHECK (valor > 0),
  pago_em date,
  pagamento_id bigint REFERENCES public.pagamentos_honorarios(id) ON DELETE SET NULL,
  criado_por uuid DEFAULT auth.uid(),
  criado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE (caso_id, numero)
);
CREATE INDEX IF NOT EXISTS parcelas_honorarios_vencimento_idx ON public.parcelas_honorarios (vencimento) WHERE pago_em IS NULL;
ALTER TABLE public.parcelas_honorarios ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS parcelas_honorarios_select ON public.parcelas_honorarios;
DROP POLICY IF EXISTS parcelas_honorarios_insert ON public.parcelas_honorarios;
DROP POLICY IF EXISTS parcelas_honorarios_update ON public.parcelas_honorarios;
DROP POLICY IF EXISTS parcelas_honorarios_delete ON public.parcelas_honorarios;
CREATE POLICY parcelas_honorarios_select ON public.parcelas_honorarios FOR SELECT TO authenticated USING (true);
CREATE POLICY parcelas_honorarios_insert ON public.parcelas_honorarios FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY parcelas_honorarios_update ON public.parcelas_honorarios FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY parcelas_honorarios_delete ON public.parcelas_honorarios FOR DELETE TO authenticated USING (true);

-- Gera (ou refaz) o plano de parcelas em aberto de um caso: n parcelas mensais a partir do 1º vencimento,
-- com os centavos de arredondamento na última parcela. Parcelas já pagas são preservadas.
CREATE OR REPLACE FUNCTION public.gerar_parcelas(p_caso uuid, p_quantidade integer, p_primeiro date, p_valor_total numeric)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_base numeric(14,2); v_i integer; v_pagas integer; v_valor numeric(14,2); v_ultimo integer;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Faça login para parcelar honorários.'; END IF;
  IF p_quantidade < 1 OR p_quantidade > 120 THEN RAISE EXCEPTION 'Informe de 1 a 120 parcelas.'; END IF;
  IF p_valor_total IS NULL OR p_valor_total <= 0 THEN RAISE EXCEPTION 'Informe um valor total maior que zero.'; END IF;
  DELETE FROM parcelas_honorarios WHERE caso_id = p_caso AND pago_em IS NULL;
  SELECT count(*), coalesce(max(numero), 0) INTO v_pagas, v_ultimo FROM parcelas_honorarios WHERE caso_id = p_caso;
  v_base := floor(p_valor_total / p_quantidade * 100) / 100;
  FOR v_i IN 1..p_quantidade LOOP
    v_valor := CASE WHEN v_i = p_quantidade THEN p_valor_total - v_base * (p_quantidade - 1) ELSE v_base END;
    INSERT INTO parcelas_honorarios (caso_id, numero, vencimento, valor)
    VALUES (p_caso, v_ultimo + v_i, (p_primeiro + make_interval(months => v_i - 1))::date, v_valor);
  END LOOP;
  UPDATE tarefas SET vencimento_honorario = p_primeiro, atualizado_em = now() WHERE id = p_caso AND (vencimento_honorario IS NULL OR vencimento_honorario > p_primeiro);
  RETURN p_quantidade;
END $$;

-- Quita uma parcela: registra o pagamento (o gatilho já soma no recebido do caso) e marca a parcela como paga.
CREATE OR REPLACE FUNCTION public.quitar_parcela(p_parcela bigint, p_data date DEFAULT current_date, p_meio text DEFAULT 'pix', p_observacao text DEFAULT NULL)
RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_p parcelas_honorarios%ROWTYPE; v_pag bigint;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Faça login para registrar o pagamento.'; END IF;
  SELECT * INTO v_p FROM parcelas_honorarios WHERE id = p_parcela FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Parcela não encontrada.'; END IF;
  IF v_p.pago_em IS NOT NULL THEN RAISE EXCEPTION 'Esta parcela já está paga.'; END IF;
  INSERT INTO pagamentos_honorarios (caso_id, data, valor, meio, observacao)
  VALUES (v_p.caso_id, p_data, v_p.valor, coalesce(p_meio, 'pix'), coalesce(p_observacao, 'Parcela ' || v_p.numero))
  RETURNING id INTO v_pag;
  UPDATE parcelas_honorarios SET pago_em = p_data, pagamento_id = v_pag WHERE id = p_parcela;
  RETURN v_pag;
END $$;

-- Se o pagamento ligado à parcela for apagado, a parcela volta a ficar em aberto.
CREATE OR REPLACE FUNCTION public.reabrir_parcela_ao_apagar_pagamento() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN UPDATE parcelas_honorarios SET pago_em = NULL, pagamento_id = NULL WHERE pagamento_id = old.id; RETURN old; END $$;
DROP TRIGGER IF EXISTS trg_reabrir_parcela ON public.pagamentos_honorarios;
CREATE TRIGGER trg_reabrir_parcela BEFORE DELETE ON public.pagamentos_honorarios FOR EACH ROW EXECUTE FUNCTION public.reabrir_parcela_ao_apagar_pagamento();

-- Resumo semanal (e-mail de segunda): parcelas que vencem em 7 dias e parcelas atrasadas, com o valor atrasado.
CREATE OR REPLACE FUNCTION public.resumo_semanal(p_escritorio uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid)
 RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path TO 'public' AS $function$
  with
  t as (select count(*) filter (where prazo < current_date) vencidas,
               count(*) filter (where prazo between current_date and current_date + 7) semana,
               count(*) filter (where prioridade = 'alta' and situacao <> 'feito') alta
        from tarefas where situacao <> 'feito' and tipo is distinct from 'projeto'),
  i as (select count(*) filter (where not lida) nao_lidas,
               count(*) filter (where prazo_final between current_date and current_date + 7) prazo_semana,
               count(*) filter (where prazo_final < current_date and not lida) prazo_vencido
        from intimacoes where coalesce(oab,'') not like 'busca:%'),
  c as (select count(*) filter (where data_vencimento < current_date) vencidos,
               count(*) filter (where data_vencimento between current_date and current_date + 30) em_30,
               count(*) filter (where data_vencimento between current_date and current_date + 60) em_60,
               coalesce(sum(valor_periodico) filter (where data_vencimento between current_date and current_date + 60),0) valor_60
        from contratos where encerrado_em is null),
  a as (select count(*) filter (where data_evento between current_date and current_date + 7) semana,
               (select string_agg(titulo || ' (' || to_char(data_evento,'DD/MM') || ')', '; ' order by data_evento)
                  from (select titulo, data_evento from compromissos where data_evento between current_date and current_date + 7 order by data_evento limit 5) x) lista
        from compromissos),
  h as (select coalesce(sum(honorario_previsto - coalesce(honorario_recebido,0)),0) em_aberto,
               count(*) filter (where vencimento_honorario < current_date and coalesce(honorario_recebido,0) < coalesce(honorario_previsto,0)) atrasados
        from tarefas where tipo = 'projeto' and honorario_previsto > 0),
  p as (select count(*) filter (where vencimento between current_date and current_date + 7) vencendo,
               count(*) filter (where vencimento < current_date) atrasadas,
               coalesce(sum(valor) filter (where vencimento < current_date), 0) valor_atrasado
        from parcelas_honorarios where pago_em is null),
  r as (select count(*) filter (where data_ultimo_reajuste is not null and data_ultimo_reajuste + interval '1 year' between current_date and current_date + 30) reajustes_30
        from contratos where encerrado_em is null)
  select jsonb_build_object(
    'semana', to_char(current_date, 'DD/MM/YYYY'),
    'socia', jsonb_build_object(
       'contratos_vencidos', c.vencidos, 'contratos_60_dias', c.em_60, 'valor_60_dias', c.valor_60,
       'honorarios_em_aberto', h.em_aberto, 'honorarios_atrasados', h.atrasados,
       'parcelas_vencendo_7_dias', p.vencendo, 'parcelas_atrasadas', p.atrasadas, 'valor_parcelas_atrasadas', p.valor_atrasado,
       'tarefas_alta', t.alta, 'intimacoes_nao_lidas', i.nao_lidas),
    'advogada', jsonb_build_object(
       'intimacoes_nao_lidas', i.nao_lidas, 'prazos_processuais_semana', i.prazo_semana, 'prazos_vencidos', i.prazo_vencido,
       'tarefas_semana', t.semana, 'tarefas_vencidas', t.vencidas, 'audiencias_compromissos', a.semana),
    'secretaria', jsonb_build_object(
       'compromissos_semana', a.semana, 'compromissos_lista', coalesce(a.lista, ''),
       'contratos_30_dias', c.em_30, 'reajustes_30_dias', r.reajustes_30, 'tarefas_vencidas', t.vencidas)
  ) from t, i, c, a, h, p, r
$function$;
