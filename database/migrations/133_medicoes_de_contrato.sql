-- 133 — Medição de contrato, para projeto público e privado, em todas as plataformas
--
-- Pedido de M em 13/11/2026, 15h21: medição de contrato organizada para projeto público e privado,
-- igual em todas as plataformas, com aviso e parada do serviço quando não se recebe.
--
-- ADITIVA: só cria tabelas, funções e políticas novas. Nada existente é alterado ou apagado.
--
-- A diferença entre público e privado está no banco, não só na tela: a função que decide a parada
-- devolve false para contrato público SEMPRE. Parar serviço de órgão público tem regra própria na
-- lei de licitações e contratos, e quem decide é advogado, não gatilho. O que o sistema faz no
-- público é avisar e preparar a notificação.

create table if not exists public.contratos_servico (
  id uuid primary key default gen_random_uuid(),
  escritorio_id uuid not null,
  cliente text not null,
  plataforma text not null check (plataforma in ('direito','engenharia','geolocalizacao','saude','instituto','quantica')),
  natureza text not null check (natureza in ('publico','privado')),
  objeto text not null,
  valor_total numeric(14,2) not null default 0 check (valor_total >= 0),
  periodicidade text not null default 'mensal' check (periodicidade in ('mensal','por_etapa','unica')),
  prazo_pagamento_dias integer not null default 30 check (prazo_pagamento_dias between 0 and 365),
  -- Só tem efeito em contrato privado.
  clausula_suspensao boolean not null default false,
  servico_suspenso boolean not null default false,
  vigencia_inicio date,
  vigencia_fim date,
  criado_em timestamptz not null default now()
);
comment on table public.contratos_servico is 'Contrato de serviço medido por período, de projeto público ou privado, em qualquer plataforma.';

create table if not exists public.medicoes_contrato (
  id uuid primary key default gen_random_uuid(),
  contrato_id uuid not null references public.contratos_servico(id) on delete cascade,
  numero integer not null,
  periodo text not null,                      -- "11/2026", "Etapa 3"
  valor_medido numeric(14,2) not null check (valor_medido >= 0),
  aprovada_em date,
  faturada_em date,
  vencimento date,
  recebida_em date,
  observacao text,
  criado_em timestamptz not null default now(),
  unique (contrato_id, numero)
);
comment on table public.medicoes_contrato is 'O que foi medido em cada período, e se o dinheiro daquele período caiu.';

-- A régua de atraso, em dias corridos depois do vencimento. Mesma da tela, e aqui é a oficial.
create or replace function public.medicao_grau(p_medicao uuid, p_hoje date default current_date)
returns text language sql stable security definer set search_path = public as $$
  select case
    when m.recebida_em is not null or m.vencimento is null then 'em_dia'
    when (p_hoje - m.vencimento) >= (case c.natureza when 'publico' then 60 else 30 end) then 'parar'
    when (p_hoje - m.vencimento) >= (case c.natureza when 'publico' then 30 else 10 end) then 'avisar_de_novo'
    when (p_hoje - m.vencimento) >= 1 then 'avisar'
    else 'em_dia'
  end
  from public.medicoes_contrato m
  join public.contratos_servico c on c.id = m.contrato_id
  where m.id = p_medicao
$$;

-- A parada automática: privado COM cláusula, e nada mais. Público devolve false sempre.
create or replace function public.medicao_para_servico(p_medicao uuid, p_hoje date default current_date)
returns boolean language sql stable security definer set search_path = public as $$
  select c.natureza = 'privado'
     and c.clausula_suspensao
     and public.medicao_grau(m.id, p_hoje) = 'parar'
  from public.medicoes_contrato m
  join public.contratos_servico c on c.id = m.contrato_id
  where m.id = p_medicao
$$;

-- O que avisar hoje, do pior para o menos grave. É daqui que sai o aviso por e-mail e em Alertas.
create or replace function public.medicoes_para_avisar(p_hoje date default current_date)
returns table (
  medicao_id uuid, contrato_id uuid, cliente text, plataforma text, natureza text,
  periodo text, valor_medido numeric, vencimento date, dias integer, grau text, para_servico boolean
) language sql stable security definer set search_path = public as $$
  select m.id, c.id, c.cliente, c.plataforma, c.natureza, m.periodo, m.valor_medido, m.vencimento,
         (p_hoje - m.vencimento)::int, public.medicao_grau(m.id, p_hoje),
         public.medicao_para_servico(m.id, p_hoje)
  from public.medicoes_contrato m
  join public.contratos_servico c on c.id = m.contrato_id
  where (public.eh_admin_instituto() or c.escritorio_id = public.escritorio_atual())
    and public.medicao_grau(m.id, p_hoje) <> 'em_dia'
  order by case public.medicao_grau(m.id, p_hoje)
             when 'parar' then 1 when 'avisar_de_novo' then 2 else 3 end,
           (p_hoje - m.vencimento) desc
$$;

alter table public.contratos_servico enable row level security;
alter table public.medicoes_contrato enable row level security;

drop policy if exists contratos_servico_escritorio on public.contratos_servico;
create policy contratos_servico_escritorio on public.contratos_servico for all to authenticated
  using (public.eh_admin_instituto() or escritorio_id = public.escritorio_atual())
  with check (public.eh_admin_instituto() or escritorio_id = public.escritorio_atual());

drop policy if exists medicoes_contrato_escritorio on public.medicoes_contrato;
create policy medicoes_contrato_escritorio on public.medicoes_contrato for all to authenticated
  using (exists (select 1 from public.contratos_servico c
                 where c.id = contrato_id
                   and (public.eh_admin_instituto() or c.escritorio_id = public.escritorio_atual())))
  with check (exists (select 1 from public.contratos_servico c
                 where c.id = contrato_id
                   and (public.eh_admin_instituto() or c.escritorio_id = public.escritorio_atual())));

revoke execute on function public.medicao_grau(uuid, date) from public;
revoke execute on function public.medicao_para_servico(uuid, date) from public;
revoke execute on function public.medicoes_para_avisar(date) from public;
grant execute on function public.medicao_grau(uuid, date) to authenticated, service_role;
grant execute on function public.medicao_para_servico(uuid, date) to authenticated, service_role;
grant execute on function public.medicoes_para_avisar(date) to authenticated, service_role;
