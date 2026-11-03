# Monetização com base no mercado brasileiro (pedido de M, 03/11/2026 21:04Z)

Este documento explica por que os passos L01 a L05 entraram na fila I-04. Eles ficam logo depois do D08 e estão encadeados por sha256.

## Dados de mercado usados (fonte pública)

| Dado | Valor | Fonte |
|---|---|---|
| Pessoas que moram de aluguel | mais de 46 milhões, recorde | IBGE, PNAD 2024, via [TNH1](https://www.tnh1.com.br/noticia/nid/populacao-que-mora-de-aluguel-supera-46-milhoes-e-bate-recorde-no-brasil/) |
| Lares alugados | 23,8% dos domicílios | IBGE, via [Jornal de Brasília](https://jornaldebrasilia.com.br/noticias/brasil/aluguel-alcanca-238-dos-lares-no-brasil-enquanto-casa-propria-ja-paga-perde-participacao/) |
| Crescimento da parcela de famílias que pagam aluguel | 25% em 8 anos | IBGE, via [Agência Brasil](https://agenciabrasil.ebc.com.br/geral/noticia/2025-08/parcela-de-familias-quem-pagam-aluguel-sobe-25-em-8-anos-mostra-ibge) |
| Advogados inscritos | 1,37 milhão, 52% com menos de 10 anos de carreira | OAB, via [Rota Jurídica](https://www.rotajuridica.com.br/?p=138294) |
| Despejo em cartório | projeto de lei avançando na Câmara | [Valor, via CNB-SP](https://cnbsp.org.br/2025/06/27/valor-economico-projeto-de-lei-que-cria-despejo-por-cartorio-avanca-na-camara/) |

## Lógica: o tempo como ativo

Primeiro entra o que já existe e pode ser lançado em dias. Ferramentas grátis trazem tráfego (tração), e as pagas vêm logo atrás. O ticket mais alto vem do B2B (imobiliárias e garantidoras), porque aí cada cliente paga por volume.

| Passo | Ferramenta | Quem paga | Por que agora |
|---|---|---|---|
| L01 | Calculadora de reajuste de aluguel (grátis) | ninguém; é a porta de entrada | 46 milhões de inquilinos, mais os locadores; cada visita vira convite para o laboratório |
| L02 | Análise de contrato de locação por IA | locador, inquilino, corretor | reaproveita a função do escritório; é o que o leigo paga para usar |
| L03 | API de probabilidade | imobiliárias, administradoras, fiança | maior ticket; a API U13 já existe |
| L04 | Relatório jurimétrico por comarca, em PDF selado | escritórios (1,37 milhão de advogados, maioria jovem) | é comprado por caso; o selo dá credibilidade |
| L05 | Lançamento com e-mail próprio e canais medidos | — | mede o custo por cadastro e o primeiro pagante |

## Credibilidade e calibragem

- Toda previsão sai com fonte, amostra, intervalo de 95% e Brier público.
- Amostra pequena mostra aviso, nunca um número sem margem.
- Cada PDF e cada medição levam selo OpenTimestamps.
- Nenhum dado pessoal é guardado (LGPD).

## Riscos

- **Cobrança.** Cobrar depende de M01 (Stripe) e M03 (hospedagem paga). Até lá, as ferramentas pagas ficam em lista de espera.
- **Preço.** A regra de M é custo × 4. No B2B, cobrar pelo valor pode render mais; essa decisão está em um cartão para M.
