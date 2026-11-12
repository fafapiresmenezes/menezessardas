# Ensaio das migrações 116 e 117 num Postgres local vazio (porta 5544): suba o banco, rode 117_base_de_ensaio.sql,
# depois as duas migrações, e então este roteiro. Cada bloco imprime o que cada tipo de conta consegue ver e fazer.
P="psql -h /tmp -p 5544 -U postgres -d t -q -t -A"
como() { # uuid sql
  $P -c "begin; select set_config('request.jwt.claims', '{\"sub\":\"$1\",\"role\":\"authenticated\"}', true) \gset
" >/dev/null 2>&1
  printf "%s\n" "begin;" "select set_config('request.jwt.claims', '{\"sub\":\"$1\",\"role\":\"authenticated\"}', true);" "set local role authenticated;" "$2" "commit;" | $P 2>&1 | grep -v '^{"sub"' 
}
M=11111111-1111-1111-1111-111111111111; F=22222222-2222-2222-2222-222222222222; L=33333333-3333-3333-3333-333333333333
echo "== Fátima virou admin da sede:"; $P -c "select funcao from usuarios_perfis where id='$F'"
echo "== 1. cadastro 'Sardas & Menezes' (existe como apelido da sede) -> pedido pendente, sem perfil"
$P -c "insert into auth.users (id,email,raw_user_meta_data) values ('aaaaaaaa-0000-0000-0000-000000000001','caio@fora.test','{\"escritorio\":\"Sardas & Menezes\"}')"
$P -c "select (select count(*) from usuarios_perfis where id='aaaaaaaa-0000-0000-0000-000000000001') perfis, (select escritorio_id||' '||nome_digitado from pedidos_entrada where usuario_id='aaaaaaaa-0000-0000-0000-000000000001')"
A1=aaaaaaaa-0000-0000-0000-000000000001
echo "-- o que ele vê:"; como $A1 "select public.meu_pedido_entrada()->>'estado', (select count(*) from configuracoes), (select count(*) from acoes_consultor), (select count(*) from consumo_api), public.perfil_atual();"
echo "-- sede vê o pedido:"; como $M "select email, nome_digitado, escritorio_nome from public.pedidos_entrada_pendentes();"
echo "-- leitor da sede não vê pedidos:"; como $L "select count(*) from public.pedidos_entrada_pendentes();"
echo "-- sede libera como operador:"; como $M "select public.definir_funcao('$A1','operador');"
$P -c "select funcao, escritorio_id from usuarios_perfis where id='$A1'; select aceito, decidido_por from pedidos_entrada where usuario_id='$A1'"
echo "-- agora ele está dentro:"; como $A1 "select public.meu_pedido_entrada()->>'estado', (select count(*) from acoes_consultor);"
echo "== 2. cadastro com escritório novo 'Alfa Advogados' -> cria e administra"
B1=bbbbbbbb-0000-0000-0000-000000000001; B2=bbbbbbbb-0000-0000-0000-000000000002; C1=cccccccc-0000-0000-0000-000000000001
$P -c "insert into auth.users (id,email,raw_user_meta_data) values ('$B1','dona@alfa.test','{\"escritorio\":\"  alfa   advogados \"}')"
$P -c "select p.funcao, e.nome from usuarios_perfis p join escritorios e on e.id=p.escritorio_id where p.id='$B1'"
echo "-- a dona do Alfa vê da sede (tudo deve ser 0, exceto o próprio):"
como $B1 "select (select count(*) from configuracoes) cfg, (select count(*) from acoes_consultor) acoes, (select count(*) from consumo_api) consumo, (select count(*) from trilha_auditoria) trilha, (select count(*) from resumos_semanais) resumos, (select count(*) from aceites_termos) aceites, (select count(*) from usuarios_perfis) perfis, (select count(*) from escritorios) escr;"
echo "-- não altera config da sede:"; como $B1 "select public.definir_configuracao('pecas_destinatarios','x@y');" | head -2
como $B1 "update configuracoes set valor='x' where chave='anthropic_api_key' returning chave;" | head -2
echo "-- link_agenda / ler_automacao / estado:"; como $B1 "select public.ler_automacao(), (select permitido from public.estado_configuracao('anthropic_api_key'));"; como $B1 "select public.link_agenda();" | head -1
echo "-- leitor não vira admin sozinho:"; como $L "update usuarios_perfis set funcao='admin' where id='$L';" | head -2
echo "== 3. segunda pessoa escreve 'ALFA ADVOGADOS' com acento/minúsculas -> pedido para o Alfa"
$P -c "insert into auth.users (id,email,raw_user_meta_data) values ('$B2','novo@alfa.test','{\"escritorio\":\"Alfa Advogados\"}')"
como $B1 "select email, nome_digitado from public.pedidos_entrada_pendentes(); select count(*) from public.listar_usuarios_v2();"
echo "-- a sede vê também:"; como $M "select count(*) from public.pedidos_entrada_pendentes();"
echo "-- dona do Alfa NÃO libera quem pediu a sede:"
$P -c "insert into auth.users (id,email,raw_user_meta_data) values ('$C1','outro@fora.test','{\"escritorio\":\"THEYE\"}')"
como $B1 "select public.definir_funcao('$C1','operador');" | head -1
echo "-- dona do Alfa libera a sua:"; como $B1 "select public.definir_funcao('$B2','leitor');"
$P -c "select p.funcao, e.nome from usuarios_perfis p join escritorios e on e.id=p.escritorio_id where p.id='$B2'"
echo "-- sede recusa o outro:"; como $M "select public.definir_funcao('$C1',null);"; como $C1 "select public.meu_pedido_entrada();"
echo "-- o recusado escreve nome novo e cria escritório:"; como $C1 "select public.entrar_em_escritorio('Beta & Filhos');"
$P -c "select p.funcao, e.nome from usuarios_perfis p join escritorios e on e.id=p.escritorio_id where p.id='$C1'"
echo "== 4. cadastro sem escritório -> sem perfil, tela pergunta"
D1=dddddddd-0000-0000-0000-000000000001
$P -c "insert into auth.users (id,email) values ('$D1','antigo@fora.test')"; como $D1 "select public.meu_pedido_entrada();"
como $D1 "select public.entrar_em_escritorio('ab');" | head -1
echo "== 5. configurações por escritório"
echo "-- leitor da sede lê cargos e escrita, não lê chave de API:"; como $L "select * from public.config_ler(array['cargos','anthropic_api_key','wcag_ultima']); select * from public.config_ler(null,'escrita_');"
echo "-- leitor não grava cargos; grava a própria tela:"; como $L "select public.config_gravar('{\"cargos\":\"{}\"}');" | head -1; como $L "select public.preferencia_gravar('/meu-dia');"; como $L "select * from public.config_ler(array['preferencias_usuarios']);"
echo "-- dona do Alfa grava cargos e escrita só no Alfa; chave proibida recusa:"; como $B1 "select public.config_gravar('{\"cargos\":\"{\\\"x\\\":\\\"socio\\\"}\",\"escrita_linguagem_voz\":\"passiva\"}');"; como $B1 "select public.config_gravar('{\"anthropic_api_key\":\"sk-x\"}');" | head -1
como $B1 "select * from public.config_ler(array['cargos','wcag_ultima']); select * from public.config_ler(null,'escrita_');"
echo "-- sede continua com o seu:"; como $M "select * from public.config_ler(array['cargos']); select * from public.config_ler(null,'escrita_'); select count(*) from configuracoes;"
$P -c "select chave from configuracoes order by 1"
echo "== 6. @gmenezes.com continua entrando direto"; $P -c "insert into auth.users (id,email,raw_user_meta_data) values ('eeeeeeee-0000-0000-0000-000000000001','ana@gmenezes.com','{\"escritorio\":\"QUALQUER\"}'); select funcao, escritorio_id from usuarios_perfis where id='eeeeeeee-0000-0000-0000-000000000001'"
echo "== 7. sede: função sem perda"; como $M "select (select count(*) from configuracoes), (select count(*) from acoes_consultor), (select count(*) from trilha_auditoria); select public.definir_configuracao('teto_mensal_brl','100');"
