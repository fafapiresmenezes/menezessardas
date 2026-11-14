# C7 — A régua honesta (baseline) da predição

## Por que este passo existe
Um modelo de previsão quase sempre parece bom quando é avaliado sobre os mesmos pontos que usou
para se ajustar. A régua deste passo é o contrário disso: o modelo é cobrado só pelo que **não
viu**, e é comparado com um palpite bobo — repetir o último valor observado. Se não errar menos que
o palpite bobo, não é publicado.

## O que entrou
- `src/lib/predicao/baseline.ts` — modelos (palpite simples, palpite do mesmo dia do ciclo,
  tendência mais ciclo), backtest de origem móvel, relatório por série e comparação entre modelos.
- `src/lib/predicao/baseline.test.ts` — 17 testes.
- `src/pages/ReguaPage.tsx` — tela **Régua de acerto dos modelos** (`/regua`).

## As quatro condições para um modelo ser publicado
1. Pelo menos 10 comparações fora da amostra.
2. Erro médio menor que o do palpite simples (`contraARegua < 1`).
3. Intervalo de 80% acertando pelo menos 70% das vezes.
4. Direção certa em mais da metade das vezes.

Cada condição que falha vira uma frase em português no campo `motivos`, e a tela mostra essas
frases. Um relatório que só aprova não serve de régua, então o teste
`num passeio aleatório o mesmo modelo é REPROVADO` existe para prender isso.

## Decisão de desenho que mudou o resultado
O intervalo **não** sai do resíduo dentro da amostra. Ele sai de refazer o ajuste em cada pedaço do
passado e anotar o erro do ponto seguinte. Medido do jeito ingênuo, o intervalo que prometia 80%
entregava 49% — ou seja, a plataforma estaria prometendo uma certeza que não tinha. Com o erro
medido andando pelo passado, a cobertura fica dentro do prometido.

## O que este passo ainda não é
Nenhuma série coletada passou por aqui: C3 (água) está esperando a primeira coleta e C4/C5 nem
começaram. O relatório na tela é de uma **série de demonstração**, e a tela diz isso com todas as
letras. Quando a primeira coleta entrar, a régua roda sobre ela sem mudar uma linha deste código.
