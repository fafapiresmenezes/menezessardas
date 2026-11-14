# C13 — Lastro e painel do trilho

## O que já existia antes desta volta
O passo T2 já tinha deixado pronta a parte difícil, e **não foi refeita**:
- `src/lib/trilho.ts` confere a corrente **no navegador de quem lê**, com um serializador que
  reproduz a forma do `json.dumps(…, ensure_ascii=False, sort_keys=True)` do Python — sem isso o
  hash sairia diferente e a conferência seria teatro.
- A tela `/lastro` mostra as duas perguntas separadas: a ligação está íntegra, e quantos hashes
  foram recalculados.
- `src/lib/ancoragem.ts` já tem o caminho do OpenTimestamps para a trilha de auditoria.

## O que entrou nesta volta (tarefa 3: painel de avanço)
- `avanco(elos)` em `src/lib/trilho.ts`: quantas voltas houve, quais passos do plano a corrente
  registra (um por código, valendo o elo mais recente) e o que cada passo declarou como pendente.
- Na tela `/lastro`, a seção **"Até onde o plano andou"**, com as pendências nas palavras do
  próprio registro.
- 6 testes em `src/lib/trilho.test.ts` e 5 em `src/pages/LastroPage.test.tsx`.

## Uma decisão que vai parecer falta e é escolha
O painel **não mostra porcentagem do plano**. A porcentagem vive no arquivo do plano, não na
corrente; calcular uma conta própria a partir dos elos daria um número que o leitor não pode
conferir, e esta tela existe justamente para que tudo o que ela afirma seja conferível na máquina
de quem duvida. O teste `não existe porcentagem aqui` prende isso.

## Por que o passo fica PARCIAL
O critério de aceite pede **âncora verificável de um relatório real** — gravar o último código da
corrente numa blockchain pública. Isso manda um dado para fora do projeto e depende do sim de M. O
programa já existe; falta a autorização, não o código. A tela diz isso ao leitor em vez de fingir
que a âncora existe.
