-- Theye Suporte Jurídico (10/11/2026): funil de vendas (leads) e lançamentos do financeiro (receitas e despesas).
-- Mesmo padrão de acesso de `tarefas`: cada escritório só vê o que é seu; leitor só lê; operador e admin gravam.
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  escritorio_id uuid not null default coalesce(escritorio_atual(), '00000000-0000-0000-0000-000000000001'::uuid),
  nome text not null check (length(nome) between 2 and 200),
  telefone text null check (telefone is null or length(telefone) <= 40),
  email text null check (email is null or length(email) <= 200),
  origem text not null default 'indicacao',
  area text null,
  assunto text null check (assunto is null or length(assunto) <= 500),
  etapa text not null default 'novo' check (etapa in ('novo','qualificacao','reuniao','proposta','negociacao','ganho','perdido')),
  valor_estimado numeric(14,2) not null default 0 check (valor_estimado >= 0),
  proximo_contato date null,
  motivo_perda text null,
  observacoes text null check (observacoes is null or length(observacoes) <= 4000),
  responsavel_id uuid null references auth.users(id),
  caso_id uuid null references public.tarefas(id) on delete set null,
  criado_por uuid not null default auth.uid() references auth.users(id),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  etapa_desde timestamptz not null default now()
);
create index if not exists leads_escritorio_etapa on public.leads (escritorio_id, etapa);
alter table public.leads enable row level security;
create policy leads_select on public.leads for select to authenticated
  using (escritorio_id = escritorio_atual() and perfil_atual() is not null);
create policy leads_insert on public.leads for insert to authenticated
  with check (escritorio_id = escritorio_atual() and perfil_atual() = any (array['admin'::usuario_funcao, 'operador'::usuario_funcao]));
create policy leads_update on public.leads for update to authenticated
  using (escritorio_id = escritorio_atual() and perfil_atual() = any (array['admin'::usuario_funcao, 'operador'::usuario_funcao]))
  with check (escritorio_id = escritorio_atual());
create policy leads_delete on public.leads for delete to authenticated
  using (escritorio_id = escritorio_atual() and (perfil_atual() = 'admin'::usuario_funcao or criado_por = auth.uid()));
revoke all on public.leads from anon;

-- Marca quando o lead mudou de etapa (para medir quanto tempo fica parado em cada uma).
create or replace function public.leads_etapa_desde() returns trigger language plpgsql as $$
begin
  new.atualizado_em := now();
  if new.etapa is distinct from old.etapa then new.etapa_desde := now(); end if;
  return new;
end $$;
drop trigger if exists leads_etapa_desde on public.leads;
create trigger leads_etapa_desde before update on public.leads for each row execute function public.leads_etapa_desde();

create table if not exists public.lancamentos_financeiros (
  id uuid primary key default gen_random_uuid(),
  escritorio_id uuid not null default coalesce(escritorio_atual(), '00000000-0000-0000-0000-000000000001'::uuid),
  tipo text not null check (tipo in ('receita','despesa')),
  categoria text not null,
  descricao text not null check (length(descricao) between 2 and 300),
  valor numeric(14,2) not null check (valor > 0),
  vencimento date not null,
  pago_em date null,
  caso_id uuid null references public.tarefas(id) on delete set null,
  cliente text null,
  reembolsavel boolean not null default false,
  criado_por uuid not null default auth.uid() references auth.users(id),
  criado_em timestamptz not null default now()
);
create index if not exists lancamentos_fin_escritorio_venc on public.lancamentos_financeiros (escritorio_id, vencimento);
alter table public.lancamentos_financeiros enable row level security;
create policy lanc_fin_select on public.lancamentos_financeiros for select to authenticated
  using (escritorio_id = escritorio_atual() and perfil_atual() = any (array['admin'::usuario_funcao, 'operador'::usuario_funcao]));
create policy lanc_fin_insert on public.lancamentos_financeiros for insert to authenticated
  with check (escritorio_id = escritorio_atual() and perfil_atual() = any (array['admin'::usuario_funcao, 'operador'::usuario_funcao]));
create policy lanc_fin_update on public.lancamentos_financeiros for update to authenticated
  using (escritorio_id = escritorio_atual() and perfil_atual() = any (array['admin'::usuario_funcao, 'operador'::usuario_funcao]))
  with check (escritorio_id = escritorio_atual());
create policy lanc_fin_delete on public.lancamentos_financeiros for delete to authenticated
  using (escritorio_id = escritorio_atual() and (perfil_atual() = 'admin'::usuario_funcao or criado_por = auth.uid()));
revoke all on public.lancamentos_financeiros from anon;
