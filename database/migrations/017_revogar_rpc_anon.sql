-- 017: RPCs administrativas deixam de ser executáveis sem login.
-- As funções SECURITY DEFINER já verificam perfil_atual() = 'admin' por dentro,
-- mas o papel anon não tem por que sequer chamá-las (lint 0028 do Supabase).
-- Usuários autenticados continuam podendo chamar: a checagem de perfil fica na função.

revoke execute on function public.definir_configuracao(text, text) from anon, public;
revoke execute on function public.remover_configuracao(text) from anon, public;
revoke execute on function public.estado_configuracao(text) from anon, public;
revoke execute on function public.definir_funcao(uuid, text) from anon, public;
revoke execute on function public.listar_usuarios() from anon, public;
-- perfil_atual() segue executável por anon: as políticas RLS a chamam em qualquer
-- consulta e para anon ela apenas devolve nulo (negar EXECUTE viraria erro de permissão).

grant execute on function public.definir_configuracao(text, text) to authenticated;
grant execute on function public.remover_configuracao(text) to authenticated;
grant execute on function public.estado_configuracao(text) to authenticated;
grant execute on function public.definir_funcao(uuid, text) to authenticated;
grant execute on function public.listar_usuarios() to authenticated;

-- Funções novas criadas no esquema public não devem nascer executáveis por anon.
alter default privileges in schema public revoke execute on functions from anon, public;
