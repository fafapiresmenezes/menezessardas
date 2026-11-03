-- Passo D21 (I-04): tudo o que só M pode resolver, em um lugar só, com opções de múltipla escolha e status visível.
-- Leitura pública (a página /falta.html mostra); a decisão é registrada pelo guardião quando M responde o cartão,
-- por isso não há escrita anônima: nada aqui aceita escrita de visitante.
create table if not exists instituto.pendencias_m (
  id text primary key,
  ordem int not null,
  onde text not null check (onde in ('instituto','escritorio')),
  titulo text not null,
  porque text not null,
  impacto text not null,
  opcoes jsonb not null,
  cartao text not null default 'nao aberto' check (cartao in ('nao aberto','aberto','respondido')),
  escolha text,
  decidido_em timestamptz,
  atualizado_em timestamptz not null default now()
);
alter table instituto.pendencias_m enable row level security;

create or replace function public.instituto_pendencias()
returns jsonb language sql stable security definer set search_path = instituto, public as $$
  select jsonb_build_object(
    'atualizado_em', (select max(atualizado_em) from pendencias_m),
    'total', (select count(*) from pendencias_m),
    'com_cartao', (select count(*) from pendencias_m where cartao <> 'nao aberto'),
    'respondidos', (select count(*) from pendencias_m where cartao = 'respondido'),
    'itens', coalesce((select jsonb_agg(jsonb_build_object(
        'id', id, 'onde', onde, 'titulo', titulo, 'porque', porque, 'impacto', impacto,
        'opcoes', opcoes, 'cartao', cartao, 'escolha', escolha,
        'decidido_em', decidido_em) order by ordem) from pendencias_m), '[]'));
$$;
revoke all on function public.instituto_pendencias() from public;
grant execute on function public.instituto_pendencias() to anon, authenticated, service_role;

-- Registro da decisão: só com o segredo do cron (o guardião), nunca por visitante.
create or replace function public.instituto_pendencia_registrar(p_id text, p_cartao text, p_escolha text, p_segredo text)
returns jsonb language plpgsql security definer set search_path = instituto, public as $$
declare ok boolean;
begin
  select p_segredo is not null and p_segredo = (select valor from public.configuracoes where chave = 'cron_segredo') into ok;
  if not ok then return jsonb_build_object('erro','sem permissao'); end if;
  if p_cartao not in ('nao aberto','aberto','respondido') then return jsonb_build_object('erro','cartao invalido'); end if;
  update pendencias_m set cartao = p_cartao, escolha = coalesce(p_escolha, escolha),
    decidido_em = case when p_cartao = 'respondido' then now() else decidido_em end,
    atualizado_em = now() where id = p_id;
  if not found then return jsonb_build_object('erro','item nao encontrado'); end if;
  return jsonb_build_object('ok', true, 'id', p_id, 'cartao', p_cartao);
end $$;
revoke all on function public.instituto_pendencia_registrar(text,text,text,text) from public;
grant execute on function public.instituto_pendencia_registrar(text,text,text,text) to anon, authenticated, service_role;
