-- 007 — Endurecimento apontado pelo auditor do Supabase (S6). Aplicar após 006.

-- Views executam com as permissões de quem consulta (respeitam a RLS).
ALTER VIEW alertas_com_prazo SET (security_invoker = true);
ALTER VIEW contratos_com_status SET (security_invoker = true);

-- Funções com caminho de busca fixo.
ALTER FUNCTION perfil_atual() SET search_path = public;
ALTER FUNCTION registrar_trilha() SET search_path = public;
ALTER FUNCTION calcular_dias_restantes() SET search_path = public;
ALTER FUNCTION preencher_imovel_analise() SET search_path = public;

-- registrar_trilha só roda como gatilho; perfil_atual só para usuários logados.
REVOKE EXECUTE ON FUNCTION registrar_trilha() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION perfil_atual() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION perfil_atual() TO authenticated;
