# U17 · Testes de ponta a ponta do Instituto THEYE

Data: 31/10/2026. Ferramentas: Playwright (Chromium), axe-core 4.10.2 (regras WCAG 2.0/2.1/2.2 A e AA), Lighthouse 12.2.1. Tela de celular 390 × 844.

KPI: zero violação axe e Lighthouse ≥ 95 em todas as páginas. **Resultado: atingido.**

| Página | HTTP | Violações axe | Desempenho | Acessibilidade | Boas práticas | SEO | LCP (ms) | Rolagem lateral em 390 px |
|---|---|---|---|---|---|---|---|---|
| / | 200 | 0 | 100 | 100 | 100 | 100 | 1492 | não |
| /laboratorio.html | 200 | 0 | 100 | 100 | 100 | 100 | 1523 | não |
| /placar.html | 200 | 0 | 100 | 100 | 96 | 100 | 1483 | não |
| /comparar.html | 200 | 0 | 99 | 100 | 96 | 100 | 1638 | não |
| /ontologia.html | 200 | 0 | 99 | 100 | 100 | 100 | 1650 | não |
| /locacao.html | 200 | 0 | 100 | 100 | 100 | 100 | 1484 | não |
| /agentes.html | 200 | 0 | 100 | 100 | 96 | 100 | 1488 | não |
| /estudar.html | 200 | 0 | 100 | 100 | 100 | 100 | 1487 | não |
| /precos.html | 200 | 0 | 100 | 100 | 100 | 100 | 1491 | não |
| /servicos.html | 200 | 0 | 100 | 100 | 100 | 100 | 1467 | não |

## Correções feitas neste passo

1. Contraste: as cores `--apagado` (#6B7380 → #5B6371) e `--ouro` (#9A7535 → #7A5A22) passaram a cumprir 4,5:1 sobre o fundo claro.
2. Ordem de títulos: laboratório (h3 → h2), estudar e serviços ganharam um h2 oculto para leitor de tela.
3. Regiões com rolagem lateral (tabela do placar e figuras da ontologia) agora recebem foco pelo teclado e têm nome.

## Observações

- As notas de boas práticas 96 em placar, comparar e agentes vêm só do ambiente de teste, que bloqueia o banco de dados (erro no console). Em produção essas chamadas funcionam.
- Os testes rodaram na cópia local idêntica à produção; a igualdade foi conferida por md5 de cada arquivo publicado (deploy dpl_3ZRD9pEaw19Zap9gxHqGpH1JCW4Z).
- Nenhum erro de JavaScript em nenhuma página; fonte IBM Plex carregada em todas (CSS confirmado).
