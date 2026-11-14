-- A33 (parte do banco): cada escritório passa a só ver os próprios arquivos na pasta "escritorio/"
-- da Nuvem. A sede mantém acesso a tudo (eh_sede()), incluindo os arquivos que já existem na raiz
-- "escritorio/" sem id — nada é movido, nada deixa de funcionar para quem já usa. Um escritório
-- parceiro, a partir de agora, só enxerga "escritorio/<o próprio id>/...".
-- Todas as políticas continuam PERMISSIVE, igual já eram (conferido no pg_policies antes de escrever).

DROP POLICY IF EXISTS nuvem_select ON storage.objects;
CREATE POLICY nuvem_select ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'nuvem' AND perfil_atual() IS NOT NULL AND (
      ((storage.foldername(name))[1] = 'escritorio' AND (eh_sede() OR (storage.foldername(name))[2] = escritorio_atual()::text))
      OR ((storage.foldername(name))[1] = 'pessoal' AND (storage.foldername(name))[2] = auth.uid()::text)
    )
  );

DROP POLICY IF EXISTS nuvem_insert ON storage.objects;
CREATE POLICY nuvem_insert ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'nuvem' AND (
      ((storage.foldername(name))[1] = 'escritorio' AND perfil_atual() = ANY (ARRAY['admin'::usuario_funcao, 'operador'::usuario_funcao])
        AND (eh_sede() OR (storage.foldername(name))[2] = escritorio_atual()::text))
      OR ((storage.foldername(name))[1] = 'pessoal' AND (storage.foldername(name))[2] = auth.uid()::text AND perfil_atual() IS NOT NULL)
    )
  );

DROP POLICY IF EXISTS nuvem_update ON storage.objects;
CREATE POLICY nuvem_update ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'nuvem' AND (
      ((storage.foldername(name))[1] = 'escritorio' AND perfil_atual() = ANY (ARRAY['admin'::usuario_funcao, 'operador'::usuario_funcao])
        AND (eh_sede() OR (storage.foldername(name))[2] = escritorio_atual()::text))
      OR ((storage.foldername(name))[1] = 'pessoal' AND (storage.foldername(name))[2] = auth.uid()::text)
    )
  )
  WITH CHECK (
    bucket_id = 'nuvem' AND (
      ((storage.foldername(name))[1] = 'escritorio' AND perfil_atual() = ANY (ARRAY['admin'::usuario_funcao, 'operador'::usuario_funcao])
        AND (eh_sede() OR (storage.foldername(name))[2] = escritorio_atual()::text))
      OR ((storage.foldername(name))[1] = 'pessoal' AND (storage.foldername(name))[2] = auth.uid()::text)
    )
  );

DROP POLICY IF EXISTS nuvem_delete ON storage.objects;
CREATE POLICY nuvem_delete ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'nuvem' AND (
      ((storage.foldername(name))[1] = 'escritorio' AND perfil_atual() = 'admin'::usuario_funcao
        AND (eh_sede() OR (storage.foldername(name))[2] = escritorio_atual()::text))
      OR ((storage.foldername(name))[1] = 'pessoal' AND (storage.foldername(name))[2] = auth.uid()::text)
    )
  );
