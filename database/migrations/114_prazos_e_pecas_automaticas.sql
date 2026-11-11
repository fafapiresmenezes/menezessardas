-- 114: robô de prazos e peças automáticas (pedido de M, 11/11/2026).
-- 1) A cada 4 horas, todos os dias, a função prazos-automaticos procura no CNJ (DJEN) as publicações dos processos
--    do escritório, pelo número, pelo nome dos advogados (inclusive de quem saiu) e pelas OABs; cada publicação nova
--    vira tarefa com prazo calculado pelo código do ramo (CPC, CLT, Juizados, CPP, ECA...).
-- 2) Duas vezes por dia, a função pecas-automaticas escreve a peça das tarefas que vencem em até 7 dias e manda
--    por e-mail, já formatada, para quem estiver em "Quem recebe as peças".
-- Pode rodar mais de uma vez sem estragar nada.

-- Configurações novas aceitas: advogados_monitorados e pecas_destinatarios (só administradores gravam).
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
  ELSIF p_chave = 'advogados_monitorados' THEN
    -- Nomes dos advogados como aparecem no Diário (inclusive de quem saiu do escritório), separados por vírgula.
    v_valor := regexp_replace(regexp_replace(v_valor, '\s*[;\n]+\s*', ', ', 'g'), '\s+', ' ', 'g');
    IF v_valor <> '' AND v_valor !~ '^[A-Za-zÀ-ÿ'' .-]{4,80}(, ?[A-Za-zÀ-ÿ'' .-]{4,80})*,?$' THEN RAISE EXCEPTION 'Escreva só os nomes, separados por vírgula, por exemplo Caio Barros, Ana Souza'; END IF;
  ELSIF p_chave = 'pecas_destinatarios' THEN
    -- Quem recebe por e-mail as peças escritas automaticamente.
    v_valor := lower(regexp_replace(v_valor, '[;\s]+', ',', 'g'));
    v_valor := regexp_replace(v_valor, ',+', ',', 'g');
    v_valor := regexp_replace(v_valor, '^,|,$', '', 'g');
    IF v_valor <> '' AND v_valor !~ '^[^@,\s]+@[^@,\s]+\.[^@,\s]+(,[^@,\s]+@[^@,\s]+\.[^@,\s]+)*$' THEN
      RAISE EXCEPTION 'Confira os e-mails: separe por vírgula, por exemplo fatima@gmail.com, contato@escritorio.com.br';
    END IF;
  ELSE RAISE EXCEPTION 'Configuração desconhecida.';
  END IF;
  INSERT INTO public.configuracoes (chave, valor, atualizado_em, atualizado_por)
  VALUES (p_chave, v_valor, now(), auth.uid())
  ON CONFLICT (chave) DO UPDATE SET valor = EXCLUDED.valor, atualizado_em = now(), atualizado_por = auth.uid();
END;
$function$;

-- Leitura do que a tela precisa mostrar (qualquer pessoa logada da equipe): nomes, OABs, quem recebe as peças
-- e o resumo da última rodada do robô. Chaves de API nunca saem daqui.
create or replace function public.ler_automacao()
returns jsonb language sql stable security definer set search_path = public as $$
  select case when auth.uid() is null or public.perfil_atual() is null then null else jsonb_build_object(
    'advogados', (select valor from configuracoes where chave = 'advogados_monitorados'),
    'oabs', (select valor from configuracoes where chave = 'oabs_monitoradas'),
    'destinatarios', (select valor from configuracoes where chave = 'pecas_destinatarios'),
    'ultima', (select valor from configuracoes where chave = 'prazos_ultima_execucao'),
    'email_ok', exists (select 1 from configuracoes where chave = 'brevo_api_key') and exists (select 1 from configuracoes where chave = 'email_remetente'),
    'ia_ok', exists (select 1 from configuracoes where chave = 'anthropic_api_key')
  ) end
$$;
revoke all on function public.ler_automacao() from public, anon;
grant execute on function public.ler_automacao() to authenticated;

-- Publicações já lidas pelo robô (para não repetir) e o que ele concluiu de cada uma.
create table if not exists public.prazos_lidos (
  publicacao_id text primary key,
  escritorio_id uuid not null default coalesce(escritorio_atual(), '00000000-0000-0000-0000-000000000001'::uuid),
  numero text not null,
  disponibilizada date,
  tribunal text, orgao text, documento text,
  texto text,
  o_que_fazer text, ato text, base text,
  publicada_em date, vence date, urgencia text, confianca text, trecho text, avisos text,
  tarefa_id uuid references public.tarefas(id) on delete set null,
  criado_em timestamptz not null default now()
);
create index if not exists prazos_lidos_numero on public.prazos_lidos (numero);
create index if not exists prazos_lidos_vence on public.prazos_lidos (escritorio_id, vence);
alter table public.prazos_lidos enable row level security;
drop policy if exists prazos_lidos_ler on public.prazos_lidos;
create policy prazos_lidos_ler on public.prazos_lidos for select to authenticated
  using (escritorio_id = escritorio_atual() and perfil_atual() is not null);

-- Peças escritas automaticamente (texto guardado para baixar de novo pela tela).
create table if not exists public.pecas_automaticas (
  id uuid primary key default gen_random_uuid(),
  escritorio_id uuid not null default coalesce(escritorio_atual(), '00000000-0000-0000-0000-000000000001'::uuid),
  tarefa_id uuid references public.tarefas(id) on delete set null,
  numero text, titulo text not null, texto text not null,
  perfil jsonb, aderencia int,
  enviada_para text[] not null default '{}', enviada_em timestamptz, erro text,
  criado_em timestamptz not null default now()
);
create index if not exists pecas_automaticas_escritorio on public.pecas_automaticas (escritorio_id, criado_em desc);
alter table public.pecas_automaticas enable row level security;
drop policy if exists pecas_automaticas_ler on public.pecas_automaticas;
create policy pecas_automaticas_ler on public.pecas_automaticas for select to authenticated
  using (escritorio_id = escritorio_atual() and perfil_atual() is not null);

-- Marca de "peça já escrita" na tarefa.
alter table public.tarefas add column if not exists peca_automatica_em timestamptz;

-- Horários (UTC; Brasília = UTC-3): robô de prazos a cada 4 horas; peças às 7h e às 13h de Brasília.
do $$
begin
  if not exists (select 1 from pg_extension where extname = 'pg_cron') then
    raise notice 'pg_cron não está ligado; ligue em Database → Extensions e rode este arquivo de novo.';
    return;
  end if;
  perform cron.unschedule(jobid) from cron.job where jobname in ('prazos-automaticos', 'pecas-automaticas');
  perform cron.schedule('prazos-automaticos', '20 */4 * * *', $cmd$
    select net.http_post(url:='https://hlraekzvgxdpiiigdxdo.supabase.co/functions/v1/prazos-automaticos',
      headers:=jsonb_build_object('Content-Type','application/json','x-region','sa-east-1','x-cron-secret',(select valor from public.configuracoes where chave='cron_segredo')),
      body:='{}'::jsonb, timeout_milliseconds:=150000) $cmd$);
  perform cron.schedule('pecas-automaticas', '0 10,16 * * *', $cmd$
    select net.http_post(url:='https://hlraekzvgxdpiiigdxdo.supabase.co/functions/v1/pecas-automaticas',
      headers:=jsonb_build_object('Content-Type','application/json','x-region','sa-east-1','x-cron-secret',(select valor from public.configuracoes where chave='cron_segredo')),
      body:='{}'::jsonb, timeout_milliseconds:=150000) $cmd$);
end $$;

-- Para conferir depois:
--   select j.jobname, d.status, d.start_time, left(d.return_message, 120) from cron.job_run_details d join cron.job j using (jobid)
--   where j.jobname in ('prazos-automaticos','pecas-automaticas') order by d.start_time desc limit 10;
--   select valor from configuracoes where chave = 'prazos_ultima_execucao';
