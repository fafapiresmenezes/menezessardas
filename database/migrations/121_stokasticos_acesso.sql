-- 121: tranca do Stokasticos (pedido de M, 13/11/2026).
-- O Stokasticos é um compartimento separado da plataforma. Para entrar é preciso senha;
-- para ganhar senha, a pessoa escreve o e-mail e a motivação, e o pedido vai para quem administra.
-- Só acrescenta: nenhuma tabela ou coluna existente é alterada ou removida.

-- Pedidos de acesso. Ninguém lê esta tabela pelo cliente: só a função do servidor (service role).
create table if not exists stokasticos_pedidos (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  motivacao text not null,
  situacao text not null default 'pendente' check (situacao in ('pendente', 'liberado', 'negado')),
  criado_em timestamptz not null default now(),
  decidido_em timestamptz,
  nota text
);

create index if not exists stokasticos_pedidos_situacao_idx on stokasticos_pedidos (situacao, criado_em desc);

-- RLS ligada e sem política nenhuma: o cliente (anon/authenticated) não lê nem escreve.
-- A função stokasticos-acesso usa a service role, que passa por cima da RLS.
alter table stokasticos_pedidos enable row level security;

-- Chaves de configuração, criadas vazias. Quem preenche é M, nunca este arquivo:
--   stokasticos_senha        senha única de entrada, conferida no servidor
--   stokasticos_email_admin  endereço que recebe os pedidos
-- Os valores ficam só no banco. Nenhum dos dois entra no repositório.
insert into configuracoes (chave, valor)
select 'stokasticos_senha', ''
where not exists (select 1 from configuracoes where chave = 'stokasticos_senha');

insert into configuracoes (chave, valor)
select 'stokasticos_email_admin', ''
where not exists (select 1 from configuracoes where chave = 'stokasticos_email_admin');
