-- Migração 016: Adiciona RLS policy em public.configuracoes para proteger chave IA
-- Problema: tabela tem RLS ligado mas sem políticas → expõe chave ANTHROPIC_API_KEY a usuários anon

-- A chave deve ser legível só por admin (perfil_atual() = 'admin')
create policy "admin_ler_configuracoes"
  on public.configuracoes
  for select
  using (perfil_atual() = 'admin');

-- Apenas admin escreve
create policy "admin_editar_configuracoes"
  on public.configuracoes
  for update
  using (perfil_atual() = 'admin')
  with check (perfil_atual() = 'admin');

create policy "admin_inserir_configuracoes"
  on public.configuracoes
  for insert
  with check (perfil_atual() = 'admin');

create policy "admin_deletar_configuracoes"
  on public.configuracoes
  for delete
  using (perfil_atual() = 'admin');
