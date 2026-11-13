-- 130 · Separação por escritório nos ARQUIVOS (parte do passo A28)
--
-- NÃO APLICADA. Espera o toque de M, porque mexe em dado que já existe (move 7 arquivos) e
-- troca políticas que hoje estão valendo. Além disso ela só funciona junto com a mudança no
-- código das telas (ver "O que muda no código", no fim) — aplicar só o SQL deixaria a Nuvem
-- e as faturas parecendo vazias para todo mundo.
--
-- O QUE FOI MEDIDO, em 13/11/2026, no banco de verdade:
--
--   Os dois baldes são privados (storage.buckets.public = false nos dois), então nada está
--   aberto na internet. O problema é outro: as políticas do armazenamento NÃO têm filtro de
--   escritório nenhum.
--
--     nuvem_select            bucket = 'nuvem'      AND perfil_atual() is not null
--                             AND ( pasta[1] = 'escritorio'
--                                   OR (pasta[1] = 'pessoal' AND pasta[2] = auth.uid()) )
--     documentos_storage_select   bucket = 'documentos' AND perfil_atual() is not null
--
--   A pasta "pessoal/<uid>/" está certa: só o dono lê. A pasta "escritorio/" e o balde
--   "documentos" inteiro, não: qualquer pessoa logada de QUALQUER escritório lê os dois.
--   Existem 6 escritórios no banco (a sede 00000000-…-0001 e cinco outros) e 7 arquivos:
--   6 em nuvem/escritorio/ e 1 em documentos/contratos/. Todos são da época em que só a sede
--   usava a plataforma, então o que está exposto hoje são arquivos da própria sede — mas a
--   política vaza para valer no dia em que o segundo escritório subir um arquivo, e
--   documentos/faturas/<mes>/ é a fatura de consumo, que é de um escritório só.
--
--   Isto não aparecia no inventário do A28 porque aquele inventário olhou tabelas e funções.
--   O armazenamento ficou de fora: é um perímetro à parte, com políticas próprias.
--
-- A CONVENÇÃO NOVA: o escritório entra no caminho, como primeira pasta depois da área.
--   nuvem:       escritorio/<escritorio_id>/…      e  pessoal/<uid>/…   (esta não muda)
--   documentos:  <escritorio_id>/contratos/…       e  <escritorio_id>/faturas/<mes>/…

begin;

-- 1. Os arquivos que já existem passam a morar debaixo da sede, que é de quem eles são.
update storage.objects
   set name = 'escritorio/00000000-0000-0000-0000-000000000001/' || substring(name from 'escritorio/(.*)$')
 where bucket_id = 'nuvem'
   and (storage.foldername(name))[1] = 'escritorio'
   and (storage.foldername(name))[2] is distinct from '00000000-0000-0000-0000-000000000001';

update storage.objects
   set name = '00000000-0000-0000-0000-000000000001/' || name
 where bucket_id = 'documentos'
   and (storage.foldername(name))[1] <> '00000000-0000-0000-0000-000000000001';

-- 2. As políticas passam a exigir que a pasta do escritório seja a do leitor.
drop policy if exists nuvem_select on storage.objects;
create policy nuvem_select on storage.objects for select using (
  bucket_id = 'nuvem' and perfil_atual() is not null and (
    ((storage.foldername(name))[1] = 'escritorio' and (storage.foldername(name))[2] = escritorio_atual()::text)
    or ((storage.foldername(name))[1] = 'pessoal' and (storage.foldername(name))[2] = auth.uid()::text)
  )
);

drop policy if exists nuvem_insert on storage.objects;
create policy nuvem_insert on storage.objects for insert with check (
  bucket_id = 'nuvem' and (
    ((storage.foldername(name))[1] = 'escritorio' and (storage.foldername(name))[2] = escritorio_atual()::text
      and perfil_atual() = any (array['admin'::usuario_funcao, 'operador'::usuario_funcao]))
    or ((storage.foldername(name))[1] = 'pessoal' and (storage.foldername(name))[2] = auth.uid()::text
      and perfil_atual() is not null)
  )
);

drop policy if exists nuvem_update on storage.objects;
create policy nuvem_update on storage.objects for update using (
  bucket_id = 'nuvem' and (
    ((storage.foldername(name))[1] = 'escritorio' and (storage.foldername(name))[2] = escritorio_atual()::text
      and perfil_atual() = any (array['admin'::usuario_funcao, 'operador'::usuario_funcao]))
    or ((storage.foldername(name))[1] = 'pessoal' and (storage.foldername(name))[2] = auth.uid()::text)
  )
) with check (
  bucket_id = 'nuvem' and (
    ((storage.foldername(name))[1] = 'escritorio' and (storage.foldername(name))[2] = escritorio_atual()::text
      and perfil_atual() = any (array['admin'::usuario_funcao, 'operador'::usuario_funcao]))
    or ((storage.foldername(name))[1] = 'pessoal' and (storage.foldername(name))[2] = auth.uid()::text)
  )
);

drop policy if exists nuvem_delete on storage.objects;
create policy nuvem_delete on storage.objects for delete using (
  bucket_id = 'nuvem' and (
    ((storage.foldername(name))[1] = 'escritorio' and (storage.foldername(name))[2] = escritorio_atual()::text
      and perfil_atual() = 'admin'::usuario_funcao)
    or ((storage.foldername(name))[1] = 'pessoal' and (storage.foldername(name))[2] = auth.uid()::text)
  )
);

drop policy if exists documentos_storage_select on storage.objects;
create policy documentos_storage_select on storage.objects for select using (
  bucket_id = 'documentos' and perfil_atual() is not null
  and (storage.foldername(name))[1] = escritorio_atual()::text
);

drop policy if exists documentos_storage_insert on storage.objects;
create policy documentos_storage_insert on storage.objects for insert with check (
  bucket_id = 'documentos'
  and (storage.foldername(name))[1] = escritorio_atual()::text
  and perfil_atual() = any (array['admin'::usuario_funcao, 'operador'::usuario_funcao])
);

drop policy if exists documentos_storage_delete on storage.objects;
create policy documentos_storage_delete on storage.objects for delete using (
  bucket_id = 'documentos'
  and (storage.foldername(name))[1] = escritorio_atual()::text
  and perfil_atual() = 'admin'::usuario_funcao
);

commit;

-- O QUE MUDA NO CÓDIGO, na mesma entrega (sem isto, as telas parecem vazias):
--   src/pages/NuvemPage.tsx    base da área do escritório: `escritorio/${escritorioId}`
--   src/pages/ConsumoPage.tsx  faturas: `${escritorioId}/faturas/${mes}`
--   src/pages/NovoImovelPage.tsx e quem mais grava em "documentos": prefixo do escritório
-- O id do escritório da pessoa já está disponível no cliente (usuarios_perfis.escritorio_id).
--
-- O QUE ESTA MIGRAÇÃO NÃO RESOLVE, dito de propósito:
--   A pasta "pessoal/<uid>/" continua por pessoa e não por escritório, e isso está certo.
--   Nada aqui trata de privacidade por advogado dentro do mesmo escritório: a pasta do
--   escritório é compartilhada com a equipe liberada, como a tela já diz.
