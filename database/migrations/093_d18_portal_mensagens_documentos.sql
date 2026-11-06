-- Passo D18 (Diamante): Portal do cliente com mensagens ao advogado, envio de documentos pelo cliente
-- e pagamento de parcela por PIX (QR com o valor da parcela). Idempotente.
CREATE TABLE IF NOT EXISTS public.mensagens_portal (
  id bigserial PRIMARY KEY,
  tarefa_id uuid NOT NULL REFERENCES public.tarefas(id) ON DELETE CASCADE,
  autor text NOT NULL CHECK (autor IN ('cliente', 'escritorio')),
  autor_nome text,
  texto text NOT NULL CHECK (length(texto) BETWEEN 1 AND 4000),
  criado_em timestamptz NOT NULL DEFAULT now(),
  lido_em timestamptz
);
CREATE INDEX IF NOT EXISTS mensagens_portal_tarefa_idx ON public.mensagens_portal (tarefa_id, criado_em);
ALTER TABLE public.mensagens_portal ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS mensagens_portal_equipe ON public.mensagens_portal;
CREATE POLICY mensagens_portal_equipe ON public.mensagens_portal FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.documentos_portal (
  id bigserial PRIMARY KEY,
  tarefa_id uuid NOT NULL REFERENCES public.tarefas(id) ON DELETE CASCADE,
  nome text NOT NULL,
  caminho text NOT NULL,
  tamanho integer NOT NULL DEFAULT 0,
  tipo text,
  enviado_em timestamptz NOT NULL DEFAULT now(),
  visto_em timestamptz
);
CREATE INDEX IF NOT EXISTS documentos_portal_tarefa_idx ON public.documentos_portal (tarefa_id, enviado_em);
ALTER TABLE public.documentos_portal ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS documentos_portal_equipe ON public.documentos_portal;
CREATE POLICY documentos_portal_equipe ON public.documentos_portal FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Caso válido do link do Portal (código de 48 caracteres, até 90 dias).
CREATE OR REPLACE FUNCTION public.portal_caso_id(p_token text) RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $$
  select c.id from tarefas c where c.portal_token = p_token and (c.portal_expira_em is null or c.portal_expira_em > now()) and c.nivel = 'projeto' and length(p_token) >= 24
$$;

CREATE OR REPLACE FUNCTION public.portal_mensagens(p_token text) RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $$
  select coalesce(jsonb_agg(jsonb_build_object('id', m.id, 'autor', m.autor, 'autor_nome', m.autor_nome, 'texto', m.texto, 'criado_em', m.criado_em) order by m.criado_em), '[]'::jsonb)
  from mensagens_portal m where m.tarefa_id = public.portal_caso_id(p_token)
$$;

CREATE OR REPLACE FUNCTION public.portal_enviar_mensagem(p_token text, p_texto text) RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $$
DECLARE v_caso uuid; v_nome text; v_id bigint; v_hoje integer;
BEGIN
  v_caso := public.portal_caso_id(p_token);
  IF v_caso IS NULL THEN RAISE EXCEPTION 'Este link não é válido ou expirou.'; END IF;
  IF length(trim(coalesce(p_texto, ''))) < 2 THEN RAISE EXCEPTION 'Escreva a mensagem.'; END IF;
  IF length(p_texto) > 4000 THEN RAISE EXCEPTION 'A mensagem pode ter até 4.000 caracteres.'; END IF;
  SELECT count(*) INTO v_hoje FROM mensagens_portal WHERE tarefa_id = v_caso AND autor = 'cliente' AND criado_em > now() - interval '1 day';
  IF v_hoje >= 30 THEN RAISE EXCEPTION 'Limite de 30 mensagens por dia atingido. Tente amanhã ou ligue para o escritório.'; END IF;
  SELECT cliente INTO v_nome FROM tarefas WHERE id = v_caso;
  INSERT INTO mensagens_portal (tarefa_id, autor, autor_nome, texto) VALUES (v_caso, 'cliente', coalesce(v_nome, 'Cliente'), trim(p_texto)) RETURNING id INTO v_id;
  RETURN v_id;
END $$;

-- Mensagens do escritório ficam lidas quando o cliente abre o portal.
CREATE OR REPLACE FUNCTION public.portal_marcar_lidas(p_token text) RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $$
DECLARE v_caso uuid; v_n integer;
BEGIN
  v_caso := public.portal_caso_id(p_token);
  IF v_caso IS NULL THEN RETURN 0; END IF;
  UPDATE mensagens_portal SET lido_em = now() WHERE tarefa_id = v_caso AND autor = 'escritorio' AND lido_em IS NULL;
  GET DIAGNOSTICS v_n = ROW_COUNT; RETURN v_n;
END $$;

CREATE OR REPLACE FUNCTION public.portal_documentos(p_token text) RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $$
  select coalesce(jsonb_agg(jsonb_build_object('id', d.id, 'nome', d.nome, 'tamanho', d.tamanho, 'enviado_em', d.enviado_em, 'visto_em', d.visto_em) order by d.enviado_em desc), '[]'::jsonb)
  from documentos_portal d where d.tarefa_id = public.portal_caso_id(p_token)
$$;

-- Parcelas do caso e dados PIX do escritório dono do caso (só chave, nome e cidade; nada sigiloso).
CREATE OR REPLACE FUNCTION public.portal_parcelas(p_token text) RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $$
  with c as (select t.id, t.escritorio_id from tarefas t where t.id = public.portal_caso_id(p_token))
  select case when (select count(*) from c) = 0 then null else jsonb_build_object(
    'pix', (select case when e.pix_chave is null then null else jsonb_build_object('chave', e.pix_chave, 'nome', e.pix_nome, 'cidade', e.pix_cidade) end
            from escritorios e, c where e.id = coalesce(c.escritorio_id, '00000000-0000-0000-0000-000000000001'::uuid)),
    'parcelas', (select coalesce(jsonb_agg(jsonb_build_object('id', p.id, 'numero', p.numero, 'vencimento', p.vencimento, 'valor', p.valor, 'pago_em', p.pago_em) order by p.numero), '[]'::jsonb)
                 from parcelas_honorarios p, c where p.caso_id = c.id)
  ) end
$$;

GRANT EXECUTE ON FUNCTION public.portal_caso_id(text), public.portal_mensagens(text), public.portal_enviar_mensagem(text, text), public.portal_marcar_lidas(text), public.portal_documentos(text), public.portal_parcelas(text) TO anon, authenticated;
