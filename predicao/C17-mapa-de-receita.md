# C17 — Mapa de receita: onde o Instituto ganha dinheiro

## A regra que manda neste passo
**Preço que M não decidiu não entra na conta.** É fácil escrever uma planilha chutando mensalidade
e número de clientes; o resultado é um número que ninguém pode cobrar de ninguém. Aqui, produto sem
preço decidido aparece na lista com o que falta para ter preço, e fica **fora** do total dos 90
dias. O total é, por isso, um **piso** — e dizer que é piso é mais útil que inventar um teto.

## O que entrou
- `src/lib/predicao/receita.ts`: 9 produtos, cada um com quem compra, como cobra, preço (ou
  `A_DEFINIR`), de onde veio o preço, meta de 90 dias, custo de atender, se paga os 5% ao Instituto,
  o que falta para vender e o esforço para destravar.
- `receita90`, `pisoDe90Dias`, `royaltyDoPiso`, `ordemDeAtaque`.
- Tela **Mapa de receita** (`/mapa-de-receita`), 9 testes na biblioteca e 4 na tela.

## O que o mapa mostra hoje, e incomoda
Tudo o que tem preço decidido é **plataforma jurídica** — e plataforma jurídica **não paga** os 5%
ao Instituto, porque é trabalho de processo. Ou seja: pelo preço de hoje, o royalty do piso é
**zero**. Isso não é erro de conta, é o retrato da situação: o dinheiro do Instituto depende de
destravar os outros produtos, e o primeiro deles é o mais barato de destravar — as **trilhas de
estudo**, que já estão no ar e só esperam um preço.

## Ordem de ataque que sai da conta
1. Plataforma jurídica (por usuário e instalação) — já pode ser vendida.
2. Trilhas de estudo — no ar, falta só o preço.
3. Boletim semanal de preço — falta coleta (C5), sinal medido (C8) e o gerador (C9).
4. Estudo sob encomenda — falta a tabela de faixas.
5. Interface de dados — falta medição por chamada e corte por falta de pagamento.
6. Engenharia, saúde e geomapeamento — falta preço e piloto.

## Fontes de preço
Os dois preços decididos vêm da decisão de M de 10/11/2026 e são importados de
`src/lib/precos.ts` — não copiados — para que mudar o preço num lugar não deixe o mapa mentindo.
Os 5% vêm de `src/lib/royalties.ts` e do gatilho no banco.
