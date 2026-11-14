-- 131 · Cada escritório, e o chefe de cada escritório, recebe tudo o que é dele
--
-- Pedido de M em 13/11/2026 14:39 UTC, com estas palavras: "Garanta que cada escritório e o chefe
-- responsável de cada escritório receba tudo, meu papel é mínimo".
--
-- O QUE ESTÁ ERRADO HOJE: seis tabelas têm uma política RESTRICTIVE que diz `eh_sede()`. Ela foi
-- posta como tranca temporária, enquanto a separação por escritório não existia — o nome da
-- política diz isso: `so_sede_ate_separar`. A separação entrou no ar nas migrações 116, 117 e 118,
-- e a tranca ficou. O efeito é o contrário do que M quer: um escritório parceiro **não vê as
-- próprias intimações, os próprios alertas nem as próprias análises de contrato**. Quem vê é só a
-- sede.
--
-- O QUE ESTA MIGRAÇÃO FAZ: troca `eh_sede()` por `eh_sede() OR escritorio_id = escritorio_atual()`.
-- Uma linha em cada. A sede continua vendo tudo, e cada escritório passa a ver o que é seu — e
-- nada do que é dos outros, porque a comparação é com o escritório de quem está lendo.
--
-- ISTO NÃO AFROUXA NADA ENTRE ESCRITÓRIOS. A política continua RESTRICTIVE, isto é, continua sendo
-- um filtro a mais por cima dos outros. O que ela deixa de fazer é esconder de um escritório os
-- dados do próprio escritório.
--
-- ANTES DE APLICAR, CONFERIR NO BANCO. Esta migração foi escrita com o conector do Supabase fora
-- do ar (502), a partir do inventário em `database/A28-inventario-por-escritorio.md`. Rodar antes:
--
--   select c.relname, p.polname, p.polpermissive, pg_get_expr(p.polqual, p.polrelid)
--     from pg_policy p join pg_class c on c.oid = p.polrelid
--     join pg_namespace n on n.oid = c.relnamespace
--    where n.nspname = 'public' and p.polname in ('so_sede_ate_separar','sede_only');
--
-- O bloco abaixo levanta erro se um par (tabela, política) do inventário não existir mais, em vez
-- de aplicar pela metade.

begin;

do $$
declare
  alvo record;
  achou boolean;
begin
  for alvo in
    select * from (values
      ('alertas',             'sede_only'),
      ('intimacoes',          'so_sede_ate_separar'),
      ('analises_contratos',  'so_sede_ate_separar'),
      ('analises_contrato',   'so_sede_ate_separar'),
      ('checagens_kyc',       'so_sede_ate_separar'),
      ('convites_escritorio', 'so_sede_ate_separar')
    ) as t(tabela, politica)
  loop
    select exists (
      select 1 from pg_policy p
        join pg_class c on c.oid = p.polrelid
        join pg_namespace n on n.oid = c.relnamespace
       where n.nspname = 'public' and c.relname = alvo.tabela and p.polname = alvo.politica
    ) into achou;

    if not achou then
      raise exception 'A política % não existe mais em public.% — confira o pg_policy antes de aplicar a 131', alvo.politica, alvo.tabela;
    end if;

    execute format('drop policy %I on public.%I', alvo.politica, alvo.tabela);
    execute format(
      'create policy %I on public.%I as restrictive for select using (public.eh_sede() or escritorio_id = public.escritorio_atual())',
      alvo.politica, alvo.tabela);
  end loop;
end
$$;

commit;

-- O QUE ESTA MIGRAÇÃO NÃO FAZ, dito de propósito:
--   Não mexe na privacidade por advogado DENTRO do escritório, que é outra regra (migrações 124 e
--   125) e continua valendo por cima desta: júnior e pleno veem o que é seu, sócio e gestor veem o
--   do escritório. Quem é sócio e quem é gestor é a administração do escritório que diz, na tela
--   Hierarquia; a plataforma nunca atribui cargo a ninguém.
--   Não trata dos arquivos: esse perímetro é a migração 130.
