# A28 — quem vê o que, tabela por tabela (fechado em 13/11/2026)

O passo A28 pergunta uma coisa só: **há tabela em que um escritório vê o que é de outro?**
Este arquivo responde para as 96 tabelas do esquema `public`, com o que o banco diz hoje, e diz o
que falta decidir. Levantado com consultas a `pg_policies`, `information_schema.columns` e
`has_table_privilege`, não de memória.

## O resumo

| Grupo | Tabelas | Situação |
| --- | --- | --- |
| Tem `escritorio_id` e já tem regra lendo o escritório | 36 | Fechado |
| Tem `escritorio_id` e **nenhuma** regra lendo essa coluna | 5 | **Migração 127**, escrita e não aplicada |
| Não tem `escritorio_id`, mas já é trancada por pessoa (`auth.uid()`) | 21 | Fechado: ninguém vê o do colega, logo ninguém vê o do outro escritório |
| Não tem `escritorio_id` e tem RLS sem política nenhuma | 6 | Fechado: RLS ligada sem política nega tudo; só a chave de serviço entra |
| O resto: material comum da plataforma e tabelas trancadas pelo caso, imóvel ou honorário a que pertencem | 29 | Fechado pela regra do pai, menos os cinco casos de decisão abaixo |

Total: 96 tabelas do esquema `public`.

Quer dizer: **nenhuma tabela com dado de cliente é vista por escritório errado**, hoje, com uma
ressalva (as 11 da migração 127, onde nenhuma linha tem escritório nulo, por isso aplicar não
esconde nada do que a Dra. Fátima vê hoje).

## As 5 que a migração 127 fecha

`alertas_tratados`, `avaliacoes_sus`, `buscas_salvas`, `consultas_juridicas`, `pedidos_entrada`.

A 127 acrescenta a regra por escritório. Onde já existe a regra por pessoa das migrações 124 e 125,
as duas são RESTRICTIVE e se somam: o resultado é "o meu, dentro do meu escritório". Conferido que
nenhuma das cinco tem linha com escritório nulo, por isso aplicar não esconde nada do que a
Dra. Fátima vê hoje.

## As 6 trancadas na sede, que são decisão e não defeito

`alertas`, `intimacoes`, `analises_contratos`, `analises_contrato`, `checagens_kyc`,
`convites_escritorio` têm uma política RESTRICTIVE chamada `so_sede_ate_separar` (em `alertas`,
`sede_only`) que diz `eh_sede()`. Nelas, quem não é da sede **não vê nada, nem o que é do próprio
escritório**. O nome diz que era provisório "até separar", e a separação está no ar desde as
migrações 116 e 117.

Quer dizer: hoje o escritório que comprou a plataforma não vê as próprias intimações, os próprios
alertas nem as próprias análises de contrato. Abrir isso muda o que esse escritório pode fazer, e
está escrito no fim do arquivo da migração 127 como decisão do M, em cartão próprio.

## As 21 trancadas por pessoa, sem coluna de escritório

`aceites_termos`, `avaliacoes_assistente`, `consumo_api`, `enquete_votos`, `estilos_escrita`,
`formatacao_escrita`, `metas_horas_pessoa`, `modelos_locacao`, `monitoramentos`,
`normas_monitoradas`, `notificacoes`, `ordem_tarefas_pessoal`, `pagamentos_honorarios`,
`parcelas_honorarios`, `perfis_julgador`, `preferencias_usuario`, `push_enviados`,
`push_inscricoes`, `push_preferencias`, `revisoes_okr`, `trilha_acesso`.

A maioria é coisa de uma pessoa só: o jeito de escrever dela, os avisos dela, a ordem em que ela
gosta de ver as tarefas. Acrescentar coluna de escritório aqui não melhora nada: `auth.uid()` já é
mais apertado do que qualquer regra por escritório seria. As de honorários e de monitoramento são
trancadas pelo caso ou pelo contrato a que pertencem, que por sua vez é trancado por escritório.

## As 6 fechadas por não ter política

`avisos_dois_fatores`, `jurimetria_cache`, `leis_texto`, `outlook_conexoes`, `pedidos_entrada`,
`stokasticos_pedidos`.

RLS ligada e nenhuma política significa que ninguém lê pela chave pública, nem logado. Quem usa
essas tabelas são as funções de servidor, com a chave de serviço, ou funções `SECURITY DEFINER`.
É o estado mais fechado possível.

## O que é decisão do M, não defeito

Material comum da plataforma, hoje legível por qualquer pessoa logada, de qualquer escritório:

- `modelos_locacao` — modelos de contrato de locação.
- `modelos_calibragem` — calibragem dos modelos de previsão.
- `novidades_portais` — radar dos portais dos tribunais.
- `precos_api` — preço por modelo de IA. É o custo da plataforma, visível a todo usuário de todo
  escritório. Pode ser que o M prefira isso só na sede.

Os três primeiros são conhecimento que a plataforma entrega a quem assina: deixar comum parece
certo. O quarto é número de dentro da casa.

## Um achado, com migração escrita

`centros_custo_nicho` guarda receita, custo e saldo do Instituto por nicho, e a única política dela
era `USING (true)`, com `SELECT` concedido ao papel `anon`: **qualquer pessoa com a chave pública do
site podia ler esses números sem fazer login**. A migração `128` troca isso por "quem está logado na
sede". Escrita, não aplicada.

## As funções SECURITY DEFINER, agora auditadas (13/11/2026)

A pergunta "quem vê o que" não para nas tabelas. Uma função `SECURITY DEFINER` roda com os poderes
de quem a definiu e por isso passa por cima de **toda** política de tabela. Medido no banco:

| Medida | Número |
| --- | --- |
| Funções `SECURITY DEFINER` no esquema `public` | 177 |
| Executáveis pelo papel `anon`, isto é, **sem login** | 116 |
| Dessas, sem nenhuma tranca no corpo (nem `auth.uid()`, nem `eh_sede()`, nem token, nem segredo) | 53 |

`anon` as alcança porque o Postgres concede EXECUTE a PUBLIC por padrão em toda função nova, e
`anon` herda de PUBLIC. Não foi escolha de ninguém: é o padrão do banco.

Conferido executando de verdade, com `set role anon` e sem nenhum JWT: `instituto_pendencias()`
devolveu 7.251 caracteres, `instituto_okr()` 4.869, `instituto_placar_unico()` 3.327,
`instituto_cobertura()` 3.273, `instituto_negocio(30)` 3.157. Dentro vinham a regra de preço do
Instituto, o custo de infraestrutura, a série de receita por dia e a lista de decisões pendentes.

**O achado mais sério:** `kyc_pendentes_reconsulta()` devolve CNPJ, nome e grau de risco de todas as
empresas que o escritório mandou checar, sem login nenhum — passando por cima da política
`so_sede_ate_separar` da tabela `checagens_kyc`, que é das mais fechadas que existem.

A migração `129` fecha o "sem login" de 26 funções, sem tocar em nenhum corpo: `revoke execute from
public` e depois `grant` para quem precisa. Ela fecha só o sem-login; quem, entre as pessoas já
logadas, deve ver os números do Instituto é decisão do M. O que a 129 de propósito deixa aberto, e
por quê, está escrito no fim do arquivo dela — inclusive as seis funções que ficam abertas porque
fechá-las exige mudar código de servidor, não privilégio.

## O que este inventário não cobre

A pergunta "quem vê o que" também depende das funções `SECURITY DEFINER`, que montam respostas
dentro do banco com os poderes de quem as definiu e por isso passam por cima de toda política. A
`semana_agenda` era uma delas, e é o que a migração `126` fecha. As outras funções `SECURITY DEFINER` foram
auditadas em 13/11/2026 e estão na seção acima, com a migração `129`. O que continua **não**
coberto é o esquema `instituto`, que tem funções próprias, e as seis funções que a 129 deixa
abertas por dependerem de mudança em código de servidor.
