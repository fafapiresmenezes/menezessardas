-- Passo D09 (Diamante): chave gratuita do Portal da Transparência (CGU) para consultar PEP na checagem de contraparte.
-- Acrescenta a chave 'transparencia_api_key' às configurações aceitas por definir_configuracao (só admin; valor nunca é lido pelo navegador).
CREATE OR REPLACE FUNCTION public.definir_configuracao(p_chave text, p_valor text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_valor TEXT := btrim(coalesce(p_valor, ''));
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Faça login para alterar configurações.'; END IF;
  IF public.perfil_atual() IS DISTINCT FROM 'admin'::usuario_funcao THEN RAISE EXCEPTION 'Apenas administradores podem alterar configurações.'; END IF;
  IF p_chave = 'anthropic_api_key' THEN
    IF v_valor !~ '^sk-ant-[A-Za-z0-9_-]{20,}$' THEN RAISE EXCEPTION 'Formato de chave inválido: ela deve começar com sk-ant-.'; END IF;
  ELSIF p_chave = 'resend_api_key' THEN
    IF v_valor !~ '^re_[A-Za-z0-9_]{10,}$' THEN RAISE EXCEPTION 'Formato de chave inválido: ela deve começar com re_.'; END IF;
  ELSIF p_chave = 'brevo_api_key' THEN
    IF v_valor !~ '^xkeysib-[A-Za-z0-9-]{20,}$' THEN RAISE EXCEPTION 'Formato de chave inválido: ela deve começar com xkeysib-.'; END IF;
  ELSIF p_chave = 'escavador_api_key' THEN
    IF v_valor !~ '^\S{30,}$' THEN RAISE EXCEPTION 'Formato de token inválido: copie o token completo do Escavador.'; END IF;
  ELSIF p_chave = 'transparencia_api_key' THEN
    IF v_valor !~ '^[A-Za-z0-9]{20,}$' THEN RAISE EXCEPTION 'Formato de chave inválido: copie a chave do e-mail do Portal da Transparência (letras e números).'; END IF;
  ELSIF p_chave = 'oabs_monitoradas' THEN
    v_valor := upper(regexp_replace(v_valor, '[;\s]+', ',', 'g'));
    IF v_valor <> '' AND v_valor !~ '^\d{3,7}/[A-Z]{2}(,\d{3,7}/[A-Z]{2})*,?$' THEN RAISE EXCEPTION 'Use o formato número/UF separado por vírgula, por exemplo 123456/RJ, 98765/RJ'; END IF;
  ELSIF p_chave = 'email_remetente' THEN
    v_valor := lower(v_valor);
    IF v_valor !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN RAISE EXCEPTION 'Confira o e-mail do remetente.'; END IF;
  ELSIF p_chave = 'email_avisos_extra' THEN
    v_valor := lower(regexp_replace(v_valor, '[;\s]+', ',', 'g'));
    IF v_valor <> '' AND v_valor !~ '^[^@,\s]+@[^@,\s]+\.[^@,\s]+(,[^@,\s]+@[^@,\s]+\.[^@,\s]+)*,?$' THEN
      RAISE EXCEPTION 'Confira os e-mails: separe por vírgula, por exemplo fatima.menezes@lsm.law, contato@lsm.law';
    END IF;
  ELSE RAISE EXCEPTION 'Configuração desconhecida.';
  END IF;
  INSERT INTO public.configuracoes (chave, valor, atualizado_em, atualizado_por)
  VALUES (p_chave, v_valor, now(), auth.uid())
  ON CONFLICT (chave) DO UPDATE SET valor = EXCLUDED.valor, atualizado_em = now(), atualizado_por = auth.uid();
END;
$function$;
