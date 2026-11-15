# D5 — Frente de IA e superinteligência: agenda de pesquisa

**Data:** 13/11/2026. **Publicada em:** tela `/pesquisa-ia` da plataforma (bloco do Instituto) e
`src/lib/ia/agenda.ts`, onde cada linha está travada por teste.

## A regra do passo, e por que ela é a parte importante

O plano manda: **sem alegação de capacidade que não foi medida.** Agenda de pesquisa em IA é o lugar
onde essa regra morre primeiro — basta escrever "estamos pesquisando previsão com IA de ponta" e
ninguém cobra. Por isso toda linha desta agenda tem quatro campos obrigatórios, e o quarto é o que
raramente aparece em agenda nenhuma: **o que invalidaria a hipótese**.

O teste `src/lib/ia/agenda.test.ts` recusa linha sem medida, recusa linha sem falseador e exige que
a medida tenha número ou período. Uma linha escrita com adjetivo não entra.

## As seis linhas

| Linha | O que faria desistir |
| --- | --- |
| O grafo melhora a previsão de 7 a 30 dias? | Empatar ou perder do modelo só da série em duas janelas seguidas |
| Quanto o atraso da fonte come da previsão? | Diferença abaixo de 5% nas três fontes |
| Agente que cita fonte erra menos? | Não reduzir afirmação sem respaldo, ou passar a recusar em mais de um terço dos casos |
| A plataforma sabe o quanto não sabe? | Desvio acima de 15 pontos em qualquer faixa com 20+ casos |
| Juntar casos parecidos ajuda ou vicia? | Repetição entre peças subir sem ganho na avaliação cega |
| O que cai primeiro com computador quântico? | Ataque prático contra a corrente de hash |

Cada uma diz também **em que braço o resultado chega primeiro** — previsão, coleta, consultores,
jurimetria, escrita, trilha. Pesquisa que não chega em braço nenhum não entra na agenda.

## O que esta frente não afirma

1. A plataforma **não é superinteligente, não é consciente e não "entende" o caso**: organiza, busca
   e calcula. "Superinteligência" é o nome da frente de pesquisa, não a descrição do produto.
2. Nenhuma capacidade é anunciada antes de ter medida publicada, com número e período.
3. Previsão sai sempre com a incerteza junto.
4. Nada do que a frente produz decide sozinho sobre a vida de alguém: a peça é rascunho e quem
   assina é o advogado.

## Política de segurança e uso responsável

- Experimento roda em dado público ou do próprio escritório, nunca em dado de cliente sem o pedido dele.
- Modelo novo entra primeiro **ao lado** do jeito antigo, e só substitui depois de medida.
- Agente não escreve no banco de produção sem revisão humana no caminho.
- **Resultado que contraria o interesse comercial do Instituto é publicado do mesmo jeito.**
- Nenhuma análise de rosto, emoção, mentira ou perfil psicológico, em nenhuma linha.

## Seminário interno, de três em três meses

Quatro por ano: 15/02, 17/05, 16/08 e 16/11 de 2027. Pauta mínima, e é curta de propósito:

1. O que foi medido no trimestre, com número.
2. **Que hipótese foi abandonada, e por quê.**
3. Que decisão de produto mudou por causa de uma medida.

Um seminário que não consegue responder ao item 2 por dois trimestres seguidos é sinal de que a
agenda virou vitrine. Está escrito aqui para alguém poder cobrar depois.
