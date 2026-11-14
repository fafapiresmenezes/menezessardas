-- A32 (última tabela): M escolheu "cada um convida o seu" no cartão de 14/11/2026 23h39.
-- Única política da tabela, hoje PERMISSIVE e só para a sede; continua PERMISSIVE (não há outra
-- política de SELECT nesta tabela que isso precise travar, então não cabe AS RESTRICTIVE aqui —
-- ver /tmp/claude/memory/team/silo/restrictive-vs-permissive-rls.md antes de qualquer dúvida).
DROP POLICY IF EXISTS convites_sede_admin ON public.convites_escritorio;
CREATE POLICY convites_sede_admin ON public.convites_escritorio FOR ALL TO authenticated
  USING (
    perfil_atual() = 'admin'::usuario_funcao
    AND (eh_sede() OR escritorio_id = escritorio_atual())
  )
  WITH CHECK (
    perfil_atual() = 'admin'::usuario_funcao
    AND (eh_sede() OR escritorio_id = escritorio_atual())
  );
