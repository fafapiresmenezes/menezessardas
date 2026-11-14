# C6 — O grafo que liga tudo

**Data:** 13/11/2026. **Estado: parcial, e o que falta tem nome.** O motor está pronto e testado
(`src/lib/predicao/grafo.ts`, 16 testes). A consulta sobre o grafo **real** ainda não roda porque as
coletas de água (C3), minério (C4) e agro (C5) não foram disparadas — a de água está instalada e
esperando um toque, as outras duas nem começaram. O que existe hoje roda sobre grafo de exemplo.

## As três partes, e por que a primeira decide tudo

### 1. Resolvedor de entidades

Nome que vem da fonte precisa virar nó. A ordem é dura de propósito:

1. **Identificador oficial** (CNPJ, código do IBGE, código da ANA) manda sempre — confiança 1.
2. **Nome igual depois de normalizado** (sem acento, sem pontuação, sem "S.A.", "Ltda", "Cia") — 0,95.
3. **Parecença de nome** acima de **0,75** (palavras em comum, Jaccard) — e a confiança vai junto.
4. **Abaixo disso, nulo**, com o motivo escrito e o "quase foi" anexado para conferência humana.

O item 4 é o ponto do passo inteiro. Resolvedor que chuta junta duas empresas diferentes num nó só,
e a partir daí **todo número do grafo está errado sem ninguém ver**. Dois nós com o mesmo nome
também param a resolução, em vez de o sistema escolher um.

### 2. Arestas com fonte

Dez tipos (`controla`, `fornece`, `licencia`, `montante_de`, `opera_em`, `pertence_a`,
`concorre_com`, `regula`, `insumo_de`, `escoa_por`), cada um com o que quer dizer em português e com
uma marca: se faz sentido **subir** por ele numa busca de pressão. "Concorre com" e "pertence a" não
sobem; "é insumo de", "escoa por" e "regula" sobem.

Nenhuma aresta entra sem **fonte** e sem **data de início**. Aresta sem fonte é opinião nossa
disfarçada de dado.

### 3. Testes de consistência

`conferir(grafo)` devolve lista vazia quando está são. Pega: nó sem fonte; aresta sem fonte, sem
data, para nó inexistente ou para si mesma; fim antes do início; tipo desconhecido; evento sem
fonte; evento que diz ter sido **sabido antes de acontecer**; evento apontando para nó inexistente;
e ciclo em `montante_de` — rio não fica acima de si mesmo.

## A consulta do critério de aceite

`pressionam(grafo, 'soja', { de, ate })` sobe as arestas que fazem sentido subir, até 3 saltos, e
devolve **só os nós que tiveram fato novo na janela**, cada um com:

- o caminho até a soja, aresta por aresta, **cada passo com a sua fonte**;
- os eventos daquele nó na janela, com valor, unidade e fonte;
- a distância (perto pesa mais que longe, e por isso ordena a lista).

Duas regras que mudam a resposta:

- **Ligação sem fato novo não entra.** Topologia não é pressão desta semana.
- **Ligação que já tinha acabado antes da janela não conta**, e a que ainda não começou, também não.

No grafo de exemplo, a resposta sai assim:

> Bacia do Rio Exemplo: Volume útil caiu (28.4 %). Ligação: a origem é insumo do destino. Fontes:
> ana_snirh.
> Rodovia do Exemplo: Trecho interditado. Ligação: a origem escoa pelo destino; depois a origem
> escoa pelo destino. Fontes: antaq, antt.

**A resposta nunca é um número nosso.** É a lista do que está ligado, com de onde veio. O número que
pesa cada pressão é o passo C8 ("sinal do grafo"), e ele só pode ser medido depois de haver série.

## O que falta para fechar o C6

1. Rodar as coletas (C3 água, C4 minério, C5 agro) — ver `predicao/C3-agua-ana.md`.
2. Ligar `pressionam` ao grafo que está no banco (esquema `instituto`), por uma função de servidor,
   já que o navegador não alcança esse esquema.
3. Só então a frase do critério de aceite pode ser dita sobre dado real, em vez de exemplo.
