-- Perfil da casa (18/11/2026, pedido de M: a casa de fundos internacionais não é plataforma jurídica).
-- Só acrescenta: uma coluna nova com valor padrão 'direito' (nada muda para as casas que já existem) e o campo
-- 'perfil' na resposta de marca_escritorio. Não apaga nem altera dado algum, e não mexe em política de leitura.
-- A casa de demonstração passa a ter o perfil 'projectos': marca THEYE, "Plataforma, Governança, Fundos Internacionais" e menu próprio.
-- Sem marca de cliente: só entra com autorização dele.

alter table public.escritorios
  add column if not exists perfil text not null default 'direito'
  check (perfil in ('direito', 'projectos'));

create or replace function public.marca_escritorio(p_id uuid)
 returns jsonb
 language sql
 stable security definer
 set search_path to 'public'
as $function$
  select jsonb_build_object('nome', coalesce(e.nome_exibicao, e.nome), 'cor', coalesce(e.cor, '#14213D'), 'logo_url', e.logo_url, 'sede', e.id = '00000000-0000-0000-0000-000000000001', 'perfil', e.perfil)
  from public.escritorios e where e.id = coalesce(p_id, '00000000-0000-0000-0000-000000000001')
$function$;

-- "create or replace" mantém as permissões que a função já tinha; repetimos para ficar explícito.
revoke execute on function public.marca_escritorio(uuid) from public, anon;
grant execute on function public.marca_escritorio(uuid) to authenticated, service_role;

update public.escritorios set perfil = 'projectos', nome = 'Fundos Internacionais Demonstração', nome_exibicao = 'THEYE'
 where id = '71b3145c-ca88-4ab8-a4af-24b07d6e8b82';
