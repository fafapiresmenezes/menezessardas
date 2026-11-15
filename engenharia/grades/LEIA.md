# Grades das escolas de engenharia — o que foi colhido de verdade

Pedido de M em 13/11/2026 21:23: *"veja todo conteúdo programático de todas as 10 universidades de
engenharia do mundo"*.

Arquivo de dados: `grades-v1.json`.

## A regra deste diretório

Disciplina só entra se veio da **página oficial da escola**, com a URL registrada. Cada grade tem:

- `procedencia`: `transcricao_da_pagina` (texto literal da tabela), `resumo_de_modelo_a_conferir`
  (passou por resumo e pode ter erro de código ou título) ou `nao_colhido`;
- `conferido`: só vira `true` quando **uma pessoa** comparar com a página.

Nada aqui foi completado com conhecimento do modelo. Onde não deu para ler, está escrito que não
deu, e por quê.

## O que a colheita de 13/11/2026 conseguiu

| Escola | Curso | Estado |
| --- | --- | --- |
| Berkeley | Civil Engineering 2026-27 | **colhido**, transcrição da tabela: 27 disciplinas por ano, as regras de cada eletiva e o mínimo de 120 unidades |
| MIT | Mechanical Engineering (Course 2) | colhido **parcial**, via resumo: 13 disciplinas de núcleo, as quatro de projeto, 24 eletivas restritas e os totais de unidades — **a conferir** |
| MIT | Civil (1-C) e Environmental (1-E) | recusado pelo `robots.txt` do `catalog.mit.edu` |
| TU Delft | Civil e Mechanical | erro de cliente em quatro rotas, inclusive o guia de estudos |
| ETH Zürich | Bauingenieurwissenschaften | erro de cliente, e o catálogo de aulas recusa por `robots.txt` |
| Caltech | catálogo em PDF | erro de cliente no próprio site |
| Stanford, Cambridge, Oxford, Imperial, NUS, NTU, Tsinghua | — | ainda não tentadas |

## A conclusão honesta, que vale mais que a tabela

**Isto não se resolve rodando mais vezes.** A maioria dos catálogos de universidade recusa leitura
por programa — uns pelo `robots.txt`, outros com erro de cliente — e insistir na mesma URL dá o
mesmo resultado. Para fechar as dez escolas serve uma de três rotas:

1. o **PDF oficial** do programa de cada escola, quando existe e é alcançável;
2. o **navegador de M**, abrindo a página e colando o texto;
3. o repositório institucional de cada escola, que costuma ser mais aberto que o catálogo.

Enquanto não fechar, **a plataforma não mostra grade como se fosse conferida**. Uma grade inventada
por semelhança seria pior que grade nenhuma: o engenheiro acreditaria nela.
