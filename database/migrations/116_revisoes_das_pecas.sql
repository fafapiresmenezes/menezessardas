-- Peças automáticas: toda peça passa por 4 revisões (fatos, fundamentação, escrita, acabamento) antes de ir por e-mail.
-- O rascunho fica com revisao_pendente = true; a rodada "revisar" dá uma passada por vez e, na 4ª, envia.
alter table public.pecas_automaticas
  add column if not exists revisao_pendente boolean not null default false,
  add column if not exists revisoes smallint not null default 0,
  add column if not exists revisao_em timestamptz;

create index if not exists pecas_automaticas_revisao_idx on public.pecas_automaticas (criado_em) where revisao_pendente;
