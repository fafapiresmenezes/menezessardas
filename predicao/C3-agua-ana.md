# C3 — Água: ANA/SNIRH no grafo do Instituto

**Data:** 13/11/2026. **Fonte consultada:** Sistema de Acompanhamento de Reservatórios da ANA
(https://sar.ana.gov.br). **Licença:** dado aberto do governo federal (Lei 12.527/2011 e Decreto
8.777/2016) — uso livre, inclusive comercial, com citação da fonte.

## Por que água, e qual fatia

Água é o dado público brasileiro com valor direto em três negócios: hidrovia (calado e janela de
navegação), irrigação (outorga e disponibilidade) e energia (volume útil dos reservatórios do
sistema interligado). O SAR publica **medição diária por reservatório**, com quatro grandezas:

| Grandeza | Unidade | O que é |
| --- | --- | --- |
| Volume útil | % | Quanto do volume que se pode usar ainda está lá |
| Cota | m | Altura da água acima do nível do mar |
| Afluência | m³/s | Água entrando |
| Defluência | m³/s | Água saindo |

**Ficou de fora de propósito:** a telemetria por estação do HidroWeb (milhares de séries, outro
cadastro e outro volume) e a outorga. Entram num passo próprio, se e quando houver cliente.

## Duas decisões que valem mais que o código

**1. O dia da medição e o dia em que o número chegou são colunas diferentes.** `ocorrido_em` é o dia
do SAR; `observado_em` é a hora em que a coleta rodou. O SAR publica com dias de atraso, então
misturar as duas faria qualquer modelo de previsão parecer melhor do que é. A tela mostra o atraso
médio em horas, à vista.

**2. Revisão da ANA entra como linha nova, não sobrescreve.** Quando a agência corrige um número já
publicado, o conteúdo muda, o hash do conteúdo muda e a medição nova entra ao lado da antiga, com
outro `observado_em`. A leitura usa a mais recentemente observada e conta quantas vezes aquele dia
foi revisado. Dado público revisado é informação sobre a fonte, não erro a apagar.

## Onde cada coisa mora

- **Coleta:** `supabase/functions/ana-agua/index.ts`. Roda no servidor porque o contêiner de
  desenvolvimento não alcança `sar.ana.gov.br` (o proxy de saída recusa) e porque a chave que
  escreve no esquema `instituto` não pode chegar ao navegador. Três modos: `conferir` (diagnóstico,
  aberto, só as três operações públicas do SAR), `coletar` (exige o segredo do agendador) e `serie`
  (leitura aberta, para o gráfico).
- **Tabelas:** nenhuma nova. São as quatro da ontologia do C1 (migração 122), e a fonte
  `ana_snirh` já estava cadastrada lá. Reservatório vira entidade `corpo_dagua`; quando tem
  coordenada, vira também um `lugar` do tipo ponto; cada medição vira um evento
  `medicao_reservatorio` ligado ao reservatório pelo papel `objeto`.
- **Horário:** `database/migrations/134_agua_ana_agendada.sql` — só agenda, uma vez por dia, de
  madrugada, pedindo os últimos 30 dias (janela, e não "ontem", por causa das revisões).
- **Tela:** `/agua`, no bloco do Instituto. Série desenhada, tabela com os mesmos números,
  atraso da informação, dias revisados e **quantos dias do período não têm medição** — a linha liga
  os dias que existem e não inventa o que falta.

## Idempotência

Cada linha carrega o hash do próprio conteúdo, pela mesma receita do navegador
(`src/lib/predicao/ontologia.ts`) e do banco (`instituto.ontologia_hash`): `chave=valor` por linha,
ordenado pela chave, SHA-256. A coleta procura o que já existe e insere só o que falta, com
`on conflict do nothing`. Rodar duas vezes o mesmo período insere zero — e isso está travado em
teste, não só prometido aqui.

## O que ainda falta, dito com nome

A função está instalada (versão 3) e testada, mas **a primeira coleta ainda não rodou**: este
contêiner não alcança nem a ANA nem o endereço das funções do Supabase, e disparar a coleta daqui
foi recusado pelo classificador de permissões. Falta uma das duas coisas, as duas de um toque:

1. aplicar a migração 134, e a coleta passa a rodar sozinha todo dia; ou
2. rodar o fluxo "Função do Instituto" no GitHub (`.github/workflows/instituto-funcao.yml`) com
   `funcao: ana-agua` e `coletar: true` — ele instala a função a partir do repositório e chama a
   coleta com o segredo lido na hora, que nunca aparece no registro. Para o botão existir, esse
   arquivo precisa chegar ao ramo principal.

Até lá a tela `/agua` mostra, em vez de gráfico, a frase que diz exatamente isso.
