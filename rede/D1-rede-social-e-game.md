# D1 — Rede de opinião do Instituto e jogo: documento de produto

**Data:** 13/11/2026. **Estado:** documento pronto para decisão de M. Nada foi construído além da
regra de consentimento (`src/lib/rede/consentimento.ts`), que já está escrita e travada por teste.

## Para que isto existe

Todo o braço de predição do Instituto (fase C) come **dado de terceiro**: GDELT, ANA, IBGE, CNJ.
Dado de terceiro tem três defeitos conhecidos: chega com atraso, muda de licença e some sem aviso.
Uma rede de opinião própria é a única fonte que o Instituto **pode prometer** que continuará
existindo — e é a única em que a pergunta é escolhida por nós.

A ideia não é "mais uma rede social". É **uma fonte de dado de opinião declarada e consentida**, com
um jogo por cima para que participar valha a pena.

## O que já existe no repositório

As enquetes internas já estão prontas e medidas (migração 105): tabela `enquetes` com RLS por
escritório, e `instituto_enquetes()`, que leva para fora do escritório **só** as enquetes marcadas
como públicas, **sem nome** e **a partir de 10 votos**. O teste `enqueteDizAVerdade.test.ts` tranca a
promessa do rótulo. Logo, a rede pública não começa do zero: começa abrindo esse mesmo mecanismo
para gente de fora do escritório.

## As três peças

### 1. Termo de uso e privacidade (LGPD)

A lista do que se coleta vive em código, não em PDF, para a tela de aceite e o termo não se separarem:

| O quê | Para quê | Base | Guardar | Sai em agregado |
| --- | --- | --- | --- | --- |
| Apelido | Aparecer ao lado do voto, dentro da rede | consentimento | enquanto a conta existir | não |
| E-mail | Entrar e recuperar senha | consentimento | enquanto a conta existir | não |
| Voto em enquete | Formar o resultado | consentimento | 2 anos | sim |
| Estado (UF) | Separar o resultado por região | consentimento | 2 anos | sim |
| Faixa etária | Separar por faixa e aplicar a regra de menores | consentimento | 2 anos | sim |
| Pontuação no jogo | Mostrar o próprio histórico | consentimento | 1 ano | não |

Apagar a conta apaga tudo o que não tem prazo próprio. O voto some sozinho em dois anos.

**O que a rede nunca faz** (está em `NUNCA`, e cada linha tem teste):

1. Não analisa rosto, emoção, mentira nem perfil psicológico de ninguém.
2. Não vasculha a rede social de ninguém: entra o que a pessoa responde aqui dentro.
3. Não vende nem entrega voto de pessoa identificada; o que sai do Instituto é sempre agregado.
4. Não usa nome, imagem nem semelhança de pessoa real no jogo.
5. Não mostra resultado com menos de 10 votos.
6. Não faz propaganda eleitoral nem recomenda voto em pessoa ou partido.

**Menores.** Abaixo de 16 anos não participa. De 16 a 17, só com o aceite de quem responde pela
pessoa. De 18 em diante, o aceite é só dela. Opinião política de adolescente não é lugar para
improvisar com o art. 14 da LGPD.

### 2. Enquetes ligadas à notícia

O GDELT já está sendo coletado (passo C2) com evento, lugar e hora. A pergunta da semana nasce daí:
assunto que subiu de atenção no Brasil vira enquete, **com o link da notícia que a originou**.

Três regras que valem mais que a mecânica:

- **A pergunta aparece com a fonte.** Enquete sem notícia atrás é pesquisa de opinião solta, e disso
  o mercado já está cheio.
- **O resultado mostra quantos votaram.** Porcentagem sem denominador é propaganda.
- **A amostra não é o Brasil, e a tela diz isso.** Quem responde é quem está na plataforma. Chamar
  isso de "o brasileiro pensa" seria mentira — e mentira que um cliente de pesquisa reconhece de
  longe, destruindo a credibilidade do resto.

### 3. O jogo

Personagens **próprios**, nome e desenho nossos. Nenhum político, juiz ou figura pública real: o
risco de imagem é alto, o ganho é zero, e o jogo nem precisa disso para funcionar.

Mecânica: a pessoa recebe um caso (um dilema de política pública ou de processo), escolhe um caminho
e vê a consequência conforme a regra escrita — não conforme opinião nossa. Acertar previsão de
enquete dá ponto: quem adivinha o que a maioria vai responder sobe no placar. Isso transforma o voto
em jogo **sem** premiar quem vota de um jeito, só quem lê bem a sala.

**O que o jogo não é:** não é simulação de julgamento real, não prevê decisão de juiz nomeado e não
dá nota a pessoa nenhuma.

## Como isto vira dinheiro (e como não)

| Caminho | O que se vende | Risco |
| --- | --- | --- |
| Boletim de opinião por tema | Série temporal de atenção e opinião, com denominador e recorte | baixo |
| Enquete encomendada | Pergunta de um cliente, resultado agregado | médio: exige dizer que a amostra é da plataforma |
| Dado bruto de pessoa identificada | **Não se vende. Nunca.** | — |

Receita de rede de opinião **é estudo**, logo cai na regra dos 5% do Instituto (migração 132).

## O que falta decidir, e é de M

1. Entra como área aberta ao público em theye.club ou só para quem é convidado?
2. O jogo entra junto do começo ou só depois que houver enquete rodando toda semana?
3. Preço do boletim e da enquete encomendada.

## O que falta construir, depois da decisão

Conta pública com aceite de termos e faixa etária; enquete pública ligada ao evento do GDELT;
placar do jogo; e o apagar-minha-conta funcionando de verdade — tudo com migração própria, nenhuma
das quais existe hoje.
