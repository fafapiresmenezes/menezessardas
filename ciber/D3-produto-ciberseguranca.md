# D3 · Cibersegurança como serviço do Instituto: documento de produto

13/11/2026. Protótipo navegável em `/superficie-de-ataque`; regras e dados de exemplo em
`src/lib/ciber/superficie.ts`. Documento para decisão, não para divulgação.

## O problema que o cliente tem

Um escritório de advocacia guarda o que o cliente tem de mais sensível e quase nunca tem alguém de
segurança. O que ele tem são perguntas sem resposta: quem alcança o quê, o que está exposto à
internet, o que acontece se o computador da secretaria for roubado, e o que fazer primeiro com o
pouco dinheiro que sobra. Produto de segurança de prateleira responde em jargão e cobra mensalidade
por um painel que ninguém abre.

## O que vendemos

**Um retrato da superfície de ataque, em português, com a fila do que fazer.** Três entregas:

1. **Inventário declarado.** Em uma conversa de duas horas, lista-se o que o escritório tem a
   proteger, de onde cada coisa é alcançável, quem alcança e quais controles já existem. Sai do
   cliente, por escrito. Não há varredura.
2. **O mapa e os achados.** Cada item com o risco calculado, e cada achado com três frases: o que é,
   por que importa e o que fazer. A fila é ordenada pelo risco, para o escritório atacar o topo.
3. **Reavaliação.** A cada trimestre, o mesmo retrato, mostrando o que saiu da lista. É aqui que
   está a assinatura: a primeira foto vende, a comparação retém.

## O que NÃO vendemos, e isso é o produto também

- **Varredura, sondagem ou teste de invasão.** Nem no cliente, nem em terceiro. O inventário é
  declarado. Quem quer teste de intrusão contrata quem faz isso, com contrato próprio e escopo
  autorizado por quem é dono do sistema.
- **Nada ofensivo.** Nenhuma ferramenta nossa procura falha em sistema de outro, e nenhum achado
  nosso diz como explorar coisa alguma: diz como fechar.
- **Promessa de imunidade.** O número que entregamos ordena a fila; não é probabilidade de invasão,
  e a tela diz isso.
- **Monitoramento 24 horas.** Não temos plantão. Dizer que temos seria o primeiro defeito do produto.

## Como o risco é calculado, e por que tão simples

`risco = exposição × sensibilidade × (1 − alívio dos controles)`, com exposição e sensibilidade de 1
a 3 e alívio somando no máximo 0,8 — controle nenhum zera risco.

É simples de propósito. O cliente precisa poder discordar de cada número na frente do consultor:
"isto não é sigiloso", "aquilo não é alcançável de fora". Modelo que ninguém entende não se
contesta, e por isso também não se corrige. As seis regras de achado são do mesmo tipo: conta
compartilhada, acesso parado há mais de 90 dias, dado sigiloso na internet sem segundo fator,
muita gente sem segundo fator, sigiloso sem cifra, sigiloso sem trilha.

## Preço (proposta, a decidir por M)

| Entrega | O que é | Preço sugerido |
| --- | --- | --- |
| Retrato inicial | inventário, mapa, achados e conversa de uma hora para explicar | valor fechado por escritório, conforme o tamanho |
| Reavaliação trimestral | o mesmo retrato, com o que mudou | mensalidade por escritório |
| Acompanhamento da fila | ajuda para executar os achados | por hora |

Os números ficam em branco de propósito: preço é decisão de M, e inventar valor aqui só criaria uma
tabela que ninguém combinou. O que o documento afirma é a forma da cobrança, não o valor.

## Por que o Instituto pode fazer isso com alguma autoridade

O que vai ser vendido já está em uso dentro da plataforma, e não como intenção: segundo fator na
entrada, trilha de acesso para auditoria, separação por escritório no banco (não só na tela),
privacidade por advogado, e auditoria das funções do banco que respondiam sem login — essa última
achou e fechou furos reais, documentados em `database/A28-inventario-por-escritorio.md` e nas
migrações 126 a 133. Vender a terceiros o que não se usa em casa é o caminho curto para o ridículo.

## Riscos do produto

| Risco | Como aparece | O que fazemos |
| --- | --- | --- |
| Confundir-se com teste de invasão | cliente espera que a gente "ache as falhas" sondando | está escrito no documento, na proposta e na própria tela |
| Virar laudo de conformidade | cliente usar o retrato como certificado em processo | o documento diz que é estudo, e nenhum texto nosso usa a palavra certificação |
| Dado do cliente em nossa mão | inventário contém o retrato da fragilidade dele | o inventário fica no escritório do cliente; o que entra na plataforma é só o resultado, e com o sim dele |
| Achado errado por inventário errado | o cliente declarou o que não é verdade | cada achado cita o que o declarou; a reavaliação corrige |
| Prometer prazo de conserto | o escritório não tem quem execute | a fila sai com esforço estimado, e a execução é outro serviço |

## Estado e próximo passo

Pronto: o protótipo navegável com dados de exemplo e as seis regras, com teste que prende que
nenhum arquivo desta parte chama a rede e que todo achado é defensivo. Falta, e depende de M:
decidir preço, e escolher o primeiro escritório piloto — que não deve ser o escritório da sede, para
o retrato não sair viciado.
