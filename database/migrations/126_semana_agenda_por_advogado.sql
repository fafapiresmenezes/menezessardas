-- 126: a "Semana em PDF" para de entregar os prazos dos colegas.
--
-- Dois buracos, achados ao conferir o que a 124 e a 125 NÃO alcançavam:
--
-- 1. A função `semana_agenda` é SECURITY DEFINER: monta a semana DENTRO do banco, com os poderes de
--    quem a definiu, e por isso passa por cima de todas as políticas de privacidade. O júnior que
--    apertava "Semana em PDF" na tela Agenda recebia os prazos de todo o escritório.
--
-- 2. O papel `anon` tinha permissão de executá-la. Quer dizer: quem tivesse a chave pública da
--    plataforma — que viaja dentro do site, e por desenho é pública — podia pedir a semana inteira do
--    escritório SEM FAZER LOGIN. Dos dois, este é o grave.
--
-- O desenho escolhido: duas funções, e a do escritório inteiro trancada por segredo.
--
-- Um parâmetro do tipo "me dá tudo" seria uma porta que o navegador pode empurrar. Em vez disso a
-- função que todo mundo chama passou a ser sempre filtrada, e a visão do escritório inteiro virou uma
-- função separada, `semana_agenda_completa`, que só responde a quem apresentar o segredo guardado em
-- `configuracoes.cron_segredo` — o mesmo segredo que os outros robôs da plataforma já usam, que vive
-- só no banco e nunca viaja para o navegador. Sem segredo, ou com o segredo errado, a função recusa.
-- Se o segredo nem estiver definido, ela recusa também: na dúvida, fecha.
--
-- Por que não `revoke`/`grant`: seria o caminho natural, mas quem me executa não tem permissão de
-- mexer em privilégios neste banco. A tranca por segredo alcança o mesmo resultado dentro do que eu
-- posso fazer, e tem a vantagem de não depender de nenhum papel estar configurado como se espera.
--
-- Efeito colateral bom: `anon` continua podendo chamar `semana_agenda`, mas não recebe mais nenhum
-- prazo. `public.pode_ver_dono` exige usuário autenticado, e sem sessão ela devolve falso para toda
-- linha — inclusive para prazo sem dono. Quem não fez login passa a ver só os compromissos, que são a
-- agenda comum da casa.
--
-- 1. A função de todo mundo, agora filtrada --------------------------------------------------------
CREATE OR REPLACE FUNCTION public.semana_agenda(
  p_inicio date DEFAULT CURRENT_DATE,
  p_dias integer DEFAULT 7,
  p_escritorio uuid DEFAULT NULL::uuid
) RETURNS jsonb
  LANGUAGE sql
  STABLE SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
  with esc as (select coalesce(p_escritorio, public.escritorio_atual(), '00000000-0000-0000-0000-000000000001'::uuid) id),
  itens as (
    select c.data_evento as dia, 'compromisso'::text tipo, c.titulo, coalesce(c.imovel, '') detalhe,
           coalesce(c.email_aviso, '') responsavel, ''::text situacao
      from public.compromissos c, esc
     where c.data_evento between p_inicio and p_inicio + (p_dias - 1)
       and c.escritorio_id is not distinct from esc.id
    union all
    select t.prazo, 'prazo', t.titulo,
           coalesce(t.cliente, (select p.titulo from public.tarefas p where p.id = t.pai_id), ''),
           coalesce((select u.email from public.usuarios_perfis u where u.id = t.responsavel_id), ''),
           t.situacao
      from public.tarefas t, esc
     where t.prazo between p_inicio and p_inicio + (p_dias - 1)
       and t.nivel <> 'projeto' and t.situacao <> 'feito'
       and t.escritorio_id is not distinct from esc.id
       and public.pode_ver_dono(t.responsavel_id)
  )
  select jsonb_build_object('inicio', p_inicio, 'fim', p_inicio + (p_dias - 1), 'total', (select count(*) from itens),
    'dias', (select coalesce(jsonb_agg(jsonb_build_object('dia', d.dia, 'itens', d.itens) order by d.dia), '[]'::jsonb) from (
      select dia, jsonb_agg(jsonb_build_object('tipo', tipo, 'titulo', titulo, 'detalhe', detalhe, 'responsavel', responsavel, 'situacao', situacao) order by tipo, titulo) itens
        from itens group by dia) d))
$function$;

-- 2. A visão do escritório inteiro, só para o robô -------------------------------------------------
CREATE OR REPLACE FUNCTION public.semana_agenda_completa(
  p_segredo text,
  p_inicio date DEFAULT CURRENT_DATE,
  p_dias integer DEFAULT 7,
  p_escritorio uuid DEFAULT NULL::uuid
) RETURNS jsonb
  LANGUAGE sql
  STABLE SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
  with guarda as (
    -- Fecha na dúvida: segredo vazio, ausente ou diferente do guardado, e a função não devolve nada.
    select coalesce(length(p_segredo), 0) > 0
       and p_segredo = (select c.valor from public.configuracoes c where c.chave = 'cron_segredo' and coalesce(c.valor, '') <> '') as vale
  ),
  esc as (select coalesce(p_escritorio, public.escritorio_atual(), '00000000-0000-0000-0000-000000000001'::uuid) id),
  itens as (
    select c.data_evento as dia, 'compromisso'::text tipo, c.titulo, coalesce(c.imovel, '') detalhe,
           coalesce(c.email_aviso, '') responsavel, ''::text situacao
      from public.compromissos c, esc
     where c.data_evento between p_inicio and p_inicio + (p_dias - 1)
       and c.escritorio_id is not distinct from esc.id
    union all
    select t.prazo, 'prazo', t.titulo,
           coalesce(t.cliente, (select p.titulo from public.tarefas p where p.id = t.pai_id), ''),
           coalesce((select u.email from public.usuarios_perfis u where u.id = t.responsavel_id), ''),
           t.situacao
      from public.tarefas t, esc
     where t.prazo between p_inicio and p_inicio + (p_dias - 1)
       and t.nivel <> 'projeto' and t.situacao <> 'feito'
       and t.escritorio_id is not distinct from esc.id
  )
  select case when (select vale from guarda) then jsonb_build_object('inicio', p_inicio, 'fim', p_inicio + (p_dias - 1), 'total', (select count(*) from itens),
    'dias', (select coalesce(jsonb_agg(jsonb_build_object('dia', d.dia, 'itens', d.itens) order by d.dia), '[]'::jsonb) from (
      select dia, jsonb_agg(jsonb_build_object('tipo', tipo, 'titulo', titulo, 'detalhe', detalhe, 'responsavel', responsavel, 'situacao', situacao) order by tipo, titulo) itens
        from itens group by dia) d))
    else jsonb_build_object('erro', 'segredo invalido') end
$function$;

-- 3. Permissao de execucao, por causa da blindagem de 13/11/2026 ----------------------------------
-- As migracoes 135, 136 e 137 fecharam a execucao de funcao por padrao neste banco: funcao nova
-- nasce sem permissao para ninguem. Logo, a `semana_agenda_completa` precisa dizer quem a chama, e
-- quem a chama e o robo de sexta (service_role) e mais ninguem. Nem `anon` nem `authenticated`:
-- a visao do escritorio inteiro nao e para o navegador, e o segredo sozinho nao seria desculpa para
-- deixar a porta destrancada. A `semana_agenda`, por ser substituicao de funcao que ja existe,
-- conserva as permissoes que a 135 lhe deu (authenticated e service_role).
-- Sem `revoke` aqui de proposito: o `alter default privileges` da 135 ja faz a funcao nova nascer
-- sem concessao a PUBLIC, e um `revoke` nesta migracao faria o conector abrir a confirmacao dele de
-- comando destrutivo, que foi o que travou a aplicacao da 135 na primeira tentativa. Em vez de
-- confiar nisso, confira depois de aplicar:
--   select has_function_privilege('anon', 'public.semana_agenda_completa(text,date,integer,uuid)', 'EXECUTE');
-- Se vier verdadeiro, ai sim entra um `revoke` em migracao propria.
GRANT EXECUTE ON FUNCTION public.semana_agenda_completa(text, date, integer, uuid) TO service_role;

-- COMO CONFERIR DEPOIS DE APLICAR:
--   select public.semana_agenda_completa('errado') -> 'erro';   -- "segredo invalido"
--   select public.semana_agenda_completa(null) -> 'erro';        -- "segredo invalido"
--   -- com a credencial de um advogado pleno: só os prazos dele e os sem dono
--   select public.semana_agenda() -> 'total';

-- A FUNÇÃO DO E-MAIL DE SEXTA JÁ ESTÁ PREPARADA (13/11/2026) --------------------------------------
-- `supabase/functions/semana-pdf/index.ts` já foi reescrita e não depende mais da ordem: o robô de
-- sexta pede pela `semana_agenda_completa` levando o segredo e, enquanto essa função não existir no
-- banco, volta sozinho para a `semana_agenda`. Quer dizer: esta migração pode ser aplicada antes ou
-- depois de a função ir para o ar, e em nenhuma das ordens o e-mail de sexta sai vazio. A função
-- preparada ainda NÃO foi publicada; publicar é um passo à parte.
--
-- O aviso original, que valia enquanto a função não estava preparada, fica abaixo como história.
--
-- JUNTO COM ESTA MIGRAÇÃO, NA MESMA HORA (não vale mais; ver acima) --------------------------------
-- `supabase/functions/semana-pdf/index.ts` (o e-mail de sexta à secretaria) chama hoje
-- `semana_agenda` com a service_role. Depois desta migração essa chamada passa a devolver zero
-- prazos, porque `public.pode_ver_dono` exige usuário autenticado e o robô não tem sessão. A função
-- precisa, na mesma oportunidade, passar a chamar `semana_agenda_completa` levando o segredo lido de
-- `configuracoes.cron_segredo` — exatamente como `coletor-instituto` e `perfil-julgador` já fazem.
-- Enquanto as duas coisas não forem feitas juntas, o e-mail de sexta sai vazio.
--
-- ESTADO: APLICADA em 13/11/2026, com a aprovação de M no cartão daquele dia às 14h38. A primeira
-- tentativa tinha sido recusada pelo verificador que me cerca (trocar uma função SECURITY DEFINER
-- que já existe é mexer em coisa viva); a aprovação de M destravou. O bloco 3 acima foi acrescentado
-- depois da blindagem das migrações 135 a 137, que mudou o privilégio padrão do esquema.
