-- Passo C25 (aplicado em 02/11/2026 via MCP): revisão de segurança do Instituto.
-- 1) Funções de manutenção do protocolo I-11 só para o dono; search_path fixo.
do $$ declare f record; begin
  for f in select p.oid::regprocedure sig from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='instituto' and p.proname like 'i11\_%' loop
    execute format('revoke execute on function %s from public, anon, authenticated', f.sig);
    execute format('alter function %s set search_path = instituto, public, extensions, pg_temp', f.sig);
  end loop;
end $$;
-- 2) Consulta grátis única mesmo com pedidos simultâneos.
create unique index if not exists consultas_uma_gratis on instituto.consultas(membro_id) where gratuita;
create or replace function public.instituto_registrar_consulta_v2(p_membro uuid, p_gratuita boolean, p_entrada jsonb, p_resultado jsonb)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  insert into instituto.consultas(membro_id, gratuita, entrada, resultado) values (p_membro, p_gratuita, p_entrada, p_resultado);
  return true;
exception when unique_violation then return false;
end $$;
revoke all on function public.instituto_registrar_consulta_v2(uuid, boolean, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.instituto_registrar_consulta_v2(uuid, boolean, jsonb, jsonb) to service_role;
