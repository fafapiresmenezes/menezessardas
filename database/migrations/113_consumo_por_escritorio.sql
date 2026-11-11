-- 113: transparência de custos de API POR ESCRITÓRIO.
-- Antes: consumo_api não sabia de qual escritório era cada uso, qualquer pessoa logada lia o consumo de todos
-- (inclusive e-mails de outros escritórios) e o teto mensal era um só para a plataforma inteira.
-- Agora: cada uso fica ligado ao escritório de quem usou; cada escritório vê só o seu (a sede continua vendo tudo,
-- para repassar os custos sem margem); cada escritório define o seu teto; a IA pausa pelo teto do escritório de quem pediu.
-- Compatível com o que já roda: as Edge Functions continuam gravando só usuario_id; um gatilho preenche o escritório.

alter table public.consumo_api add column if not exists escritorio_id uuid references public.escritorios(id) on delete set null;
create index if not exists consumo_api_escritorio_data on public.consumo_api (escritorio_id, criado_em);

-- Usos antigos: escritório de quem usou; sem usuário (avisos automáticos) ou usuário que saiu = sede.
update public.consumo_api c
   set escritorio_id = coalesce((select u.escritorio_id from public.usuarios_perfis u where u.id = c.usuario_id), '00000000-0000-0000-0000-000000000001')
 where c.escritorio_id is null;

create or replace function public.consumo_api_definir_escritorio() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.escritorio_id is null then
    select escritorio_id into new.escritorio_id from public.usuarios_perfis where id = new.usuario_id;
    new.escritorio_id := coalesce(new.escritorio_id, '00000000-0000-0000-0000-000000000001');
  end if;
  return new;
end $$;
drop trigger if exists consumo_api_escritorio on public.consumo_api;
create trigger consumo_api_escritorio before insert on public.consumo_api for each row execute function public.consumo_api_definir_escritorio();

-- Leitura: só o próprio escritório; a sede lê todos.
drop policy if exists consumo_leitura on public.consumo_api;
create policy consumo_leitura on public.consumo_api for select to authenticated
  using (public.perfil_atual() is not null
         and (escritorio_id = public.escritorio_atual() or public.escritorio_atual() = '00000000-0000-0000-0000-000000000001'));

-- Quem entra pela API não grava nem apaga consumo; só as Edge Functions (service role) gravam.
revoke all on public.consumo_api from anon;
revoke insert, update, delete, truncate on public.consumo_api from authenticated;
revoke all on public.consumo_mensal from anon;
revoke insert, update, delete, truncate on public.consumo_mensal from authenticated;

-- A visão mensal ganha o escritório (coluna nova no fim) e continua respeitando a segurança de quem consulta.
create or replace view public.consumo_mensal with (security_invoker = on) as
 SELECT (date_trunc('month'::text, (c.criado_em AT TIME ZONE 'America/Sao_Paulo'::text)))::date AS mes,
    c.funcao,
    c.modelo,
    c.usuario_id,
    COALESCE(u.email, 'sistema (avisos automáticos)'::text) AS usuario,
    sum(c.quantidade) AS usos,
    sum(c.tokens_entrada) AS tokens_entrada,
    sum(c.tokens_saida) AS tokens_saida,
    round(((sum((((c.tokens_entrada)::numeric * COALESCE(p.usd_entrada_mtok, (0)::numeric)) + ((c.tokens_saida)::numeric * COALESCE(p.usd_saida_mtok, (0)::numeric)))) / '1000000'::numeric) + sum(((c.quantidade)::numeric * COALESCE(p.usd_por_unidade, (0)::numeric)))), 4) AS custo_usd,
    c.escritorio_id
   FROM ((public.consumo_api c
     LEFT JOIN public.precos_api p ON ((p.modelo = c.modelo)))
     LEFT JOIN public.usuarios_perfis u ON ((u.id = c.usuario_id)))
  GROUP BY ((date_trunc('month'::text, (c.criado_em AT TIME ZONE 'America/Sao_Paulo'::text)))::date), c.funcao, c.modelo, c.usuario_id, COALESCE(u.email, 'sistema (avisos automáticos)'::text), c.escritorio_id;
grant select on public.consumo_mensal to authenticated;

-- Teto por escritório: a sede segue na chave antiga; os demais em "teto_mensal_brl:<id do escritório>".
create or replace function public.chave_teto(p_escritorio uuid) returns text
language sql immutable as $$
  select case when p_escritorio = '00000000-0000-0000-0000-000000000001' then 'teto_mensal_brl' else 'teto_mensal_brl:' || p_escritorio::text end $$;

create or replace function public.custo_mes_escritorio_usd(p_escritorio uuid) returns numeric
language sql stable security definer set search_path = public as $$
  select coalesce(sum(custo_usd), 0) from public.consumo_mensal
   where mes = date_trunc('month', now() at time zone 'America/Sao_Paulo')::date and escritorio_id = p_escritorio $$;
revoke execute on function public.custo_mes_escritorio_usd(uuid) from public, anon, authenticated;

-- Cotação, gasto do mês e teto, do ponto de vista de quem pergunta. A sede enxerga o total da plataforma.
create or replace function public.ler_cotacao() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'valor', (select valor::numeric from public.configuracoes where chave = 'cotacao_usd_brl'),
    'data', (select valor from public.configuracoes where chave = 'cotacao_usd_data'),
    'teto_brl', (select nullif(valor, '')::numeric from public.configuracoes where chave = public.chave_teto(coalesce(public.escritorio_atual(), '00000000-0000-0000-0000-000000000001'))),
    'mes_usd', case when coalesce(public.escritorio_atual(), '00000000-0000-0000-0000-000000000001') = '00000000-0000-0000-0000-000000000001'
                    then public.custo_mes_atual_usd()
                    else public.custo_mes_escritorio_usd(public.escritorio_atual()) end) $$;

create or replace function public.definir_teto_mensal(valor_brl numeric) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from usuarios_perfis where id = auth.uid() and funcao::text = 'admin') then raise exception 'Só administradores podem definir o teto.'; end if;
  insert into configuracoes(chave, valor) values (public.chave_teto(public.escritorio_atual()), coalesce(valor_brl::text, ''))
  on conflict (chave) do update set valor = excluded.valor;
end $$;

-- A IA pausa pelo teto do escritório de quem pediu. Sem usuário (rotinas automáticas), vale o teto da sede, como antes.
drop function if exists public.teto_consumo_atingido();
create or replace function public.teto_consumo_atingido(p_usuario uuid default null) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(
    (select nullif(valor, '')::numeric from public.configuracoes where chave = public.chave_teto(x.e))
      <= (case when x.e = '00000000-0000-0000-0000-000000000001' then public.custo_mes_atual_usd() else public.custo_mes_escritorio_usd(x.e) end)
         * (select valor::numeric from public.configuracoes where chave = 'cotacao_usd_brl'),
    false)
  from (select coalesce((select escritorio_id from public.usuarios_perfis where id = p_usuario), '00000000-0000-0000-0000-000000000001') as e) x $$;
