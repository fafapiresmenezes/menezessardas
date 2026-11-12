create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
create schema auth;
grant usage on schema auth to anon, authenticated;
create table auth.users (id uuid primary key default gen_random_uuid(), email text, raw_user_meta_data jsonb default '{}', created_at timestamptz default now(), email_confirmed_at timestamptz, last_sign_in_at timestamptz);
create table auth.mfa_factors (user_id uuid, factor_type text, status text, created_at timestamptz default now());
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claims', true)::json->>'sub','')::uuid $$;
create function auth.role() returns text language sql stable as $$ select current_setting('request.jwt.claims', true)::json->>'role' $$;
create type usuario_funcao as enum ('admin','operador','leitor');
create table public.escritorios (id uuid primary key default gen_random_uuid(), nome text not null, plano text default 'parceiro', criado_em timestamptz default now(), nome_exibicao text, cor text, logo_url text, dominio text);
create table public.usuarios_perfis (id uuid primary key references auth.users(id) on delete cascade, email text, nome_completo text, funcao usuario_funcao, criado_em timestamptz default now(), escritorio_id uuid default '00000000-0000-0000-0000-000000000001');
create table public.configuracoes (chave text primary key, valor text not null default '', atualizado_em timestamptz default now(), atualizado_por uuid references auth.users(id) on delete set null);
create table public.convites_escritorio (id uuid primary key default gen_random_uuid(), email text, token text, aceito_em timestamptz, expira_em timestamptz, escritorio_id uuid, nome_escritorio text, plano text, funcao usuario_funcao, usuario_id uuid);
create table public.avisos_dois_fatores (usuario_id uuid primary key, enviado_em timestamptz);
create function public.escritorio_atual() returns uuid language sql stable security definer set search_path=public as $$ select escritorio_id from public.usuarios_perfis where id = auth.uid(); $$;
create function public.perfil_atual() returns usuario_funcao language sql stable security definer set search_path=public as $$ select funcao from public.usuarios_perfis where id = auth.uid(); $$;
create function public.eh_sede() returns boolean language sql stable security definer set search_path=public as $$ select coalesce(public.escritorio_atual() = '00000000-0000-0000-0000-000000000001', false); $$;
create function public.definir_configuracao(p_chave text, p_valor text) returns void language plpgsql security definer set search_path=public as $$
begin
  if auth.uid() is null then raise exception 'Faça login'; end if;
  if public.perfil_atual() is distinct from 'admin'::usuario_funcao then raise exception 'Apenas administradores podem alterar configurações.'; end if;
  insert into configuracoes(chave,valor) values (p_chave,p_valor) on conflict (chave) do update set valor=excluded.valor;
end $$;
create function public.remover_configuracao(p_chave text) returns void language plpgsql security definer set search_path=public as $$ begin null; end $$;
create function public.estado_configuracao(p_chave text) returns table(permitido boolean, definida boolean, atualizado_em timestamptz, sufixo text) language plpgsql stable security definer set search_path=public as $$ begin return; end $$;
create function public.emails_avisos() returns text language plpgsql security definer set search_path=public as $$ begin return null; end $$;
create function public.ler_automacao() returns jsonb language sql stable security definer set search_path=public as $$ select null::jsonb $$;
create function public.link_agenda() returns text language plpgsql security definer set search_path=public as $$ begin return null; end $$;
create function public.admins_dois_fatores() returns table(id uuid, email text, nome text, ativado boolean, ativado_em timestamptz, avisado_em timestamptz) language sql stable security definer set search_path=public as $$ select null::uuid,null::text,null::text,null::boolean,null::timestamptz,null::timestamptz where false $$;
create function public.listar_usuarios_v2() returns table(id uuid, email text, nome_completo text, funcao usuario_funcao, criado_em timestamptz, confirmado boolean, ultimo_acesso timestamptz, escritorio_id uuid) language sql stable security definer set search_path=public as $$ select null::uuid,null::text,null::text,null::usuario_funcao,null::timestamptz,null::boolean,null::timestamptz,null::uuid where false $$;
create function public.definir_funcao(p_id uuid, p_funcao text) returns void language plpgsql security definer set search_path=public as $$ begin null; end $$;
create function public.criar_perfil_primeiro_acesso() returns trigger language plpgsql security definer set search_path=public as $$ begin return new; end $$;
create trigger tg_primeiro_acesso after insert on auth.users for each row execute function public.criar_perfil_primeiro_acesso();
alter table escritorios enable row level security; alter table usuarios_perfis enable row level security; alter table configuracoes enable row level security;
create policy escritorios_select on escritorios for select using (eh_sede() or id = escritorio_atual());
create policy mesmo_escritorio on usuarios_perfis as restrictive for all using (eh_sede() or escritorio_id = escritorio_atual());
create policy perfis_select on usuarios_perfis for select using (id = auth.uid() or perfil_atual() = 'admin');
create policy perfis_update on usuarios_perfis for update using (id = auth.uid() or perfil_atual() = 'admin');
create policy admin_ler_configuracoes on configuracoes for select using (perfil_atual()='admin');
create policy admin_inserir_configuracoes on configuracoes for insert with check (perfil_atual()='admin');
create policy admin_editar_configuracoes on configuracoes for update using (perfil_atual()='admin') with check (perfil_atual()='admin');
create policy admin_deletar_configuracoes on configuracoes for delete using (perfil_atual()='admin');
do $$ declare t text; begin
  foreach t in array array['acoes_consultor','envios_ics','fotografia_carteira','saude_sistema','metas_horas','analises_contratos','legislacao_acompanhamento','administracao_contratos','documentos_portal','lancamentos_locacao','mensagens_portal','pagamentos_honorarios','parcelas_honorarios','vistorias','avisos_teto_ia','imoveis_geo','intimacoes','relatorios_cliente_assinaturas','relatorios_cliente_envios','prestacoes_enviadas','trilha_auditoria','ancoragens','blockchain_registros','consumo_api','checagens_kyc','monitoramentos','avaliacoes_assistente','revisoes_okr','analises_contrato','metas_horas_pessoa','trilha_acesso','resumos_semanais','relatorios_mensais','aceites_termos'] loop
    execute format('create table public.%I (id serial primary key, usuario_id uuid, criado_por uuid, escritorio_id uuid, txt text)', t);
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy aberta on public.%I for all using (perfil_atual() is not null) with check (perfil_atual() is not null)', t);
    execute format('insert into public.%I (txt, escritorio_id) values (''da sede'', ''00000000-0000-0000-0000-000000000001'')', t);
  end loop; end $$;
grant usage on schema public to anon, authenticated;
grant all on all tables in schema public to anon, authenticated;
grant all on all sequences in schema public to anon, authenticated;
grant execute on all functions in schema public to anon, authenticated;
-- dados: sede com admin (M) e operador (Fátima) e leitor
insert into escritorios (id, nome) values ('00000000-0000-0000-0000-000000000001', 'Instituto THEYE');
insert into auth.users (id, email) values ('11111111-1111-1111-1111-111111111111','m@sede.test'),('22222222-2222-2222-2222-222222222222','fatima@gmenezes.com.br'),('33333333-3333-3333-3333-333333333333','leitor@sede.test');
insert into usuarios_perfis (id,email,nome_completo,funcao) values ('11111111-1111-1111-1111-111111111111','m@sede.test','M','admin'),('22222222-2222-2222-2222-222222222222','fatima@gmenezes.com.br','Fátima','operador'),('33333333-3333-3333-3333-333333333333','leitor@sede.test','Leitor','leitor');
insert into configuracoes (chave, valor) values ('anthropic_api_key','sk-segredo'),('cargos','{"11111111-1111-1111-1111-111111111111":"socio"}'),('escrita_linguagem_voz','ativa'),('wcag_ultima','{}');
