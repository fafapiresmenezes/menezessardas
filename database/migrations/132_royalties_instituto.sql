-- 132 — Royalties do Instituto: 5% sobre venda que não é processual
--
-- Pedido de M em 13/11/2026, 15h07: quando um escritório vender, usando a plataforma, qualquer
-- coisa que NÃO seja contrato ou trabalho de processo — estudo, consultoria, laudo, curso, dado,
-- pesquisa — 5% do que ele receber é royalty do Instituto, a divisão é feita na hora do
-- recebimento, o dinheiro passa pelo Instituto, há uma aba para escolher em que conta e por qual
-- forma receber (Pix, Bitcoin, transferência), e, se o cliente pagar em dinheiro, o sistema não
-- libera a entrega enquanto a parte do Instituto não estiver confirmada na conta.
--
-- Esta migração é ADITIVA: só cria tabelas, funções e políticas novas. Não altera nem apaga nada
-- que já existe, e nenhuma linha de nenhuma tabela antiga é tocada.
--
-- O QUE ELA NÃO FAZ, e é importante estar escrito: ela não move dinheiro. Nenhum programa daqui
-- manda Pix nem bitcoin. Ela calcula a divisão, registra, trava a entrega e guarda a prova. O
-- repasse em si é confirmado por quem recebe (ou, mais tarde, por um provedor de pagamento que o
-- dono conectar). Dizer que o dinheiro se divide sozinho sem provedor conectado seria mentira.

create table if not exists public.royalties_contas (
  id uuid primary key default gen_random_uuid(),
  titular text not null,
  forma text not null check (forma in ('pix', 'bitcoin', 'transferencia')),
  destino text not null,                       -- chave Pix, endereço da carteira ou dados da conta
  apelido text,
  ativa boolean not null default false,        -- só uma fica ativa por vez
  criado_em timestamptz not null default now()
);
comment on table public.royalties_contas is 'Contas em que o Instituto recebe os royalties. Uma ativa por vez; a aba /royalties é onde se escolhe.';

create unique index if not exists royalties_contas_uma_ativa
  on public.royalties_contas ((ativa)) where ativa;

create table if not exists public.vendas_servico (
  id uuid primary key default gen_random_uuid(),
  escritorio_id uuid not null,
  descricao text not null,
  tipo text not null check (tipo in ('estudo', 'consultoria', 'laudo', 'curso', 'dado', 'pesquisa', 'outro')),
  -- true = trabalho de processo (contrato processual), que NÃO paga royalty.
  processual boolean not null default false,
  valor_total numeric(14,2) not null check (valor_total >= 0),
  moeda text not null default 'BRL',
  forma_pagamento text not null default 'pix' check (forma_pagamento in ('pix', 'bitcoin', 'transferencia', 'dinheiro', 'cartao', 'boleto')),
  recebido_em timestamptz,
  entregue_em timestamptz,
  criado_por uuid default auth.uid(),
  criado_em timestamptz not null default now()
);
comment on table public.vendas_servico is 'Venda de serviço que não é processo. Toda venda com processual=false gera repasse de 5% ao Instituto.';

create table if not exists public.repasses_royalties (
  id uuid primary key default gen_random_uuid(),
  venda_id uuid not null references public.vendas_servico(id) on delete cascade,
  percentual numeric(5,4) not null default 0.0500,
  valor numeric(14,2) not null check (valor >= 0),
  conta_id uuid references public.royalties_contas(id),
  status text not null default 'pendente' check (status in ('pendente', 'enviado', 'confirmado')),
  confirmado_em timestamptz,
  comprovante text,
  criado_em timestamptz not null default now()
);
create unique index if not exists repasses_royalties_uma_por_venda on public.repasses_royalties (venda_id);
comment on table public.repasses_royalties is 'A parte do Instituto em cada venda. Criada sozinha, no mesmo instante da venda.';

-- O percentual é um só, fica aqui, e mudar exige migração nova: ninguém muda por tela.
create or replace function public.royalty_percentual() returns numeric
language sql immutable as $$ select 0.0500::numeric $$;

-- A divisão, feita na hora: toda venda não processual nasce já com o repasse calculado.
create or replace function public.royalties_dividir() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_conta uuid;
begin
  if new.processual then return new; end if;
  select id into v_conta from public.royalties_contas where ativa limit 1;
  insert into public.repasses_royalties (venda_id, percentual, valor, conta_id)
  values (new.id, public.royalty_percentual(),
          round(new.valor_total * public.royalty_percentual(), 2), v_conta)
  on conflict (venda_id) do nothing;
  return new;
end $$;

drop trigger if exists vendas_servico_divide on public.vendas_servico;
create trigger vendas_servico_divide after insert on public.vendas_servico
  for each row execute function public.royalties_dividir();

-- A trava: a entrega só sai quando a parte do Instituto está confirmada.
-- Venda processual não tem trava, e venda não recebida ainda nem chega aqui.
create or replace function public.venda_liberada(p_venda uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select case
    when v.processual then true
    else exists (select 1 from public.repasses_royalties r
                 where r.venda_id = v.id and r.status = 'confirmado')
  end
  from public.vendas_servico v where v.id = p_venda
$$;

create or replace function public.vendas_trava_entrega() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.entregue_em is not null and old.entregue_em is null
     and not public.venda_liberada(new.id) then
    raise exception 'A entrega desta venda está travada: os 5%% do Instituto ainda não foram confirmados na conta.';
  end if;
  return new;
end $$;

drop trigger if exists vendas_servico_trava on public.vendas_servico;
create trigger vendas_servico_trava before update on public.vendas_servico
  for each row execute function public.vendas_trava_entrega();

-- Quem vê o quê. Escritório vê as próprias vendas; o Instituto vê tudo.
alter table public.vendas_servico enable row level security;
alter table public.repasses_royalties enable row level security;
alter table public.royalties_contas enable row level security;

drop policy if exists vendas_servico_escritorio on public.vendas_servico;
create policy vendas_servico_escritorio on public.vendas_servico for all to authenticated
  using (public.eh_admin_instituto() or escritorio_id = public.escritorio_atual())
  with check (public.eh_admin_instituto() or escritorio_id = public.escritorio_atual());

drop policy if exists repasses_royalties_leitura on public.repasses_royalties;
create policy repasses_royalties_leitura on public.repasses_royalties for select to authenticated
  using (public.eh_admin_instituto()
         or exists (select 1 from public.vendas_servico v
                    where v.id = venda_id and v.escritorio_id = public.escritorio_atual()));

-- Confirmar o recebimento é só do Instituto: o escritório que deve não dá baixa na própria dívida.
drop policy if exists repasses_royalties_instituto on public.repasses_royalties;
create policy repasses_royalties_instituto on public.repasses_royalties for update to authenticated
  using (public.eh_admin_instituto()) with check (public.eh_admin_instituto());

drop policy if exists royalties_contas_instituto on public.royalties_contas;
create policy royalties_contas_instituto on public.royalties_contas for all to authenticated
  using (public.eh_admin_instituto()) with check (public.eh_admin_instituto());

revoke execute on function public.venda_liberada(uuid) from public;
grant execute on function public.venda_liberada(uuid) to authenticated, service_role;
revoke execute on function public.royalty_percentual() from public;
grant execute on function public.royalty_percentual() to authenticated, service_role;
