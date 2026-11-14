// Erro #9 do planejamento: os preços dos 21 serviços viajavam no JS público inicial (qualquer
// pessoa via os valores no navegador, mesmo sem login). Os preços moram agora NESTE arquivo, que
// só a tela do caderno (atrás de senha, carregada sob demanda) importa. Assim o valor fica no
// pedaço autenticado do app e não no pacote público. A tabela é por número do produto.
//
// Trava: src/data/produtos-sem-preco-publico.test.ts garante que nenhum preço volte para produtos.ts.

export const PRECOS_CADERNO: Record<number, string> = {
  1: 'R$ 300 mil',
  2: 'R$ 430 mil',
  3: 'R$ 725 mil',
  4: 'R$ 185 mil',
  5: 'R$ 590 mil',
  6: 'R$ 315 mil por turma',
  7: 'R$ 390 mil por ano',
  8: 'R$ 515 mil',
  9: 'R$ 535 mil',
  10: 'R$ 285 mil',
  11: 'R$ 350 mil',
  12: 'R$ 260 mil',
  13: 'R$ 490 mil',
  14: 'R$ 315 mil por turma',
  15: 'R$ 240 mil por ciclo anual',
  16: 'R$ 530 mil',
  17: 'R$ 690 mil',
  18: 'R$ 320 mil',
  19: 'R$ 230 mil por parecer',
  20: 'R$ 360 mil por ciclo',
  21: 'R$ 420 mil',
}
