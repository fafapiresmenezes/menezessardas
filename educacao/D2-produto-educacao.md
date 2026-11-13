# D2 — Soluções para educação: trilhas de estudo do Instituto

**Data:** 13/11/2026. **Estado:** documento de produto pronto para decisão, com protótipo no ar
(tela `/trilhas`). **Decisão que falta e é de M:** preço e formato de cobrança (as tabelas abaixo
estão com a coluna de preço em branco de propósito).

## O que já existe, e é por isso que este braço é barato

O Instituto tem **501 consultores**, dos quais **483 com ementa levantada** (12/11/2026): no total
**6.083 tópicos** com fontes nomeadas — cursos abertos de universidade (MIT OCW, Harvard), teses da
BDTD e repositórios públicos. Esse material não foi feito para ensinar: foi feito para consultar. A
tese deste passo é que **a mesma ementa, virada em plano de estudo, já é um produto** — sem escrever
conteúdo novo, sem gravar aula e sem contratar professor.

Trilhas prontas por área (as maiores):

| Área | Trilhas |
| --- | --- |
| Pós-graduação em direito | 153 |
| Graduação em direito | 51 |
| Indicadores públicos | 20 |
| Predição | 17 |
| Direito comparado | 17 |
| Teoria do direito | 16 |
| Superinteligência | 15 |
| Transparência e proveniência | 15 |
| Normas e regulação | 14 |
| Formação e leitura | 11 |

Mediana de 14 tópicos por trilha. **18 consultores ainda não têm ementa** e, por isso, não viraram
trilha: ficam de fora e a tela diz o número, em vez de mostrar trilha vazia.

## O que a trilha é

Um módulo por tópico da ementa, na ordem, cada um com: o assunto, **a fonte que o sustenta** (com
endereço) e o tempo estimado — 25 minutos de leitura, mais 20 quando há fonte para visitar. O plano
se divide em semanas conforme o tempo que a pessoa diz ter, sem partir módulo ao meio. O que a
pessoa marcou como lido fica no navegador dela.

**Módulo sem fonte na ementa aparece marcado como sem fonte.** Não some e não ganha fonte inventada.

## O que este produto NÃO é

1. **Não emite certificado, diploma nem capacitação reconhecida.** O Instituto não é instituição de
   ensino credenciada. Vender isso seria vender o que não existe.
2. **Não mede aprendizado.** Mede módulo marcado como lido, que é outra coisa. A tela escreve isso.
3. **Não substitui o curso original.** As fontes são de universidades e repositórios públicos, e o
   crédito é delas. A trilha é o caminho, não o conteúdo.
4. **Não guarda estudo em servidor** enquanto não houver assinatura com aceite em termos.

Essas quatro frases estão em `src/lib/educacao/trilhas.ts` (`NAO_PROMESSA`), aparecem na tela e
estão travadas por teste. Se alguém apagar uma, o teste quebra.

## Modelos de cobrança para M decidir

O preço é decisão de M; o que o passo entrega é o desenho de cada opção, com o que ela exige.

| Modelo | Como funciona | Exige | Preço |
| --- | --- | --- | --- |
| Assinatura por pessoa | Acesso a todas as trilhas enquanto a assinatura durar | Conta por pessoa e termos de uso | _(em branco)_ |
| Assinatura por escritório | Um valor por escritório, todo mundo de dentro estuda | Já temos multi-escritório | _(em branco)_ |
| Trilha avulsa | Compra de uma trilha, acesso permanente | Cobrança por item | _(em branco)_ |
| Trilha fechada sob medida | Ementa montada para um cliente (órgão público, empresa) | Hora de consultoria | _(em branco)_ |

**Recomendação técnica, não comercial:** começar por assinatura de escritório. É o único modelo que
não exige nada de novo — o multi-escritório já existe, a cobrança por escritório já existe e o
aceite de termos entra junto do contrato que o escritório já assina.

## O que entra na conta de royalties

Trilha vendida não é contrato processual: é **estudo**, logo cai na regra dos 5% do Instituto
(migração 132, tela `/royalties`). Isso vale tanto para a assinatura quanto para a trilha sob medida.

## Riscos, ditos antes de alguém perguntar

| Risco | Tamanho | O que já está feito |
| --- | --- | --- |
| Fonte sair do ar (link quebrado) | alto, com o tempo | A fonte é mostrada com endereço; falta um conferidor periódico de links — passo próprio |
| Confundirem com curso credenciado | alto | As quatro negativas na tela e no documento |
| Ementa envelhecer | médio | A data do levantamento aparece na tela |
| Direito autoral das fontes | baixo | Nada é copiado: a trilha aponta para a fonte original, que é aberta |

## Próximo passo deste braço

1. M escolhe o modelo e o preço.
2. Conferidor de links das 483 trilhas, com aviso quando uma fonte morrer.
3. Aceite de termos e guarda do progresso no banco (hoje é só no navegador) — aí sim com migração.
