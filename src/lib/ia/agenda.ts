/**
 * Passo D5 do plano THEYE: a agenda de pesquisa da frente de IA do Instituto.
 *
 * A regra do passo é "sem alegação de capacidade que não foi medida". Por isso toda linha de
 * pesquisa aqui carrega quatro campos obrigatórios, e um deles é o que mais falta nesse assunto:
 * **o que invalidaria a hipótese**. Linha sem falseador não é pesquisa, é propaganda — e os testes
 * recusam uma linha sem ele.
 */

export type Estado = 'em_andamento' | 'planejada' | 'parada'

export interface Linha {
  id: string
  titulo: string
  /** A afirmação que pode estar errada. */
  hipotese: string
  /** Como se mede, com número e período; nada de "melhora a qualidade". */
  medida: string
  /** O resultado que faria abandonar a hipótese. */
  invalidaria: string
  estado: Estado
  /** Em que braço do Instituto o resultado chega primeiro. */
  chegaPrimeiroEm: string
}

export const LINHAS: Linha[] = [
  {
    id: 'grafo-nowcast',
    titulo: 'O grafo melhora a previsão de curto prazo?',
    hipotese: 'Ligar eventos públicos num grafo (ontologia do C1) dá previsão de 7 a 30 dias melhor que a mesma série sozinha.',
    medida: 'Erro absoluto médio e Brier do modelo com grafo contra o modelo só da série, nas mesmas janelas, com 30 previsões registradas antes do fato.',
    invalidaria: 'O modelo com grafo empatar ou perder do modelo só da série em duas janelas seguidas.',
    estado: 'em_andamento',
    chegaPrimeiroEm: 'Predição e boletins de commodities',
  },
  {
    id: 'atraso-da-informacao',
    titulo: 'Quanto o atraso da fonte come da previsão?',
    hipotese: 'Separar o dia do fato do dia em que soubemos (ocorrido_em e observado_em) muda a medida de acerto o bastante para mudar a decisão de comprar a fonte.',
    medida: 'Mesma previsão avaliada com e sem o atraso real da fonte, em 3 fontes (GDELT, ANA, CNJ), sobre 6 meses de histórico.',
    invalidaria: 'A diferença ficar abaixo de 5% em todas as três fontes.',
    estado: 'em_andamento',
    chegaPrimeiroEm: 'Toda coleta: decide que fonte vale pagar',
  },
  {
    id: 'agente-com-fonte',
    titulo: 'Agente que cita fonte erra menos?',
    hipotese: 'Obrigar o consultor a devolver a fonte de cada afirmação reduz afirmação errada em texto jurídico.',
    medida: 'Amostra de 100 respostas, conferidas por pessoa, com e sem a exigência de fonte; contagem de afirmações sem respaldo.',
    invalidaria: 'A exigência de fonte não reduzir a contagem, ou reduzir às custas de resposta inútil (recusa em mais de um terço dos casos).',
    estado: 'em_andamento',
    chegaPrimeiroEm: 'Consultores e peças do escritório',
  },
  {
    id: 'calibragem',
    titulo: 'A plataforma sabe o quanto não sabe?',
    hipotese: 'As probabilidades que a plataforma publica são calibradas: do que ela chama de 70%, cerca de 70% acontece.',
    medida: 'Curva de calibragem e Brier em faixas de 10 pontos, sobre as previsões já registradas antes do fato.',
    invalidaria: 'Desvio sistemático acima de 15 pontos em qualquer faixa com 20 ou mais casos.',
    estado: 'em_andamento',
    chegaPrimeiroEm: 'Jurimetria e previsão de mercado',
  },
  {
    id: 'memoria-do-caso',
    titulo: 'Juntar casos parecidos ajuda ou vicia?',
    hipotese: 'Recuperar casos semelhantes melhora o rascunho da peça sem empurrar o advogado para repetir o passado.',
    medida: 'Comparação cega de 40 rascunhos por advogado, mais contagem de trechos repetidos entre peças da mesma matéria.',
    invalidaria: 'A repetição entre peças subir sem ganho na avaliação cega.',
    estado: 'planejada',
    chegaPrimeiroEm: 'Escrita de peças',
  },
  {
    id: 'pos-quantico',
    titulo: 'O que da plataforma cai primeiro com computador quântico?',
    hipotese: 'O ponto exposto não é a corrente de hash nem o selo diário, e sim a assinatura eletrônica do portal.',
    medida: 'Inventário de criptografia com o teste de Mosca, refeito a cada 6 meses (feito em 13/11/2026, passo D4).',
    invalidaria: 'Aparecer ataque prático que reduza a segurança da corrente de hash abaixo do que o inventário supõe.',
    estado: 'em_andamento',
    chegaPrimeiroEm: 'Trilha e portal do cliente',
  },
]

/**
 * O que esta frente não afirma. A primeira linha é a mais importante: superinteligência é o nome
 * da frente de pesquisa, não uma descrição do que a plataforma faz.
 */
export const NAO_AFIRMAMOS = [
  'A plataforma não é superinteligente, não é consciente e não "entende" o caso: ela organiza, busca e calcula.',
  'Nenhuma capacidade é anunciada antes de ter medida publicada, com o número e o período.',
  'Previsão sai sempre com a incerteza junto; número sozinho não sai.',
  'Nada do que a frente produz decide sozinho sobre a vida de alguém: a peça é rascunho, e quem assina é o advogado.',
] as const

/** Política de segurança da frente: o que se pode rodar, e o que exige o sim de M antes. */
export const POLITICA = [
  { regra: 'Experimento roda em dado público ou em dado do próprio escritório, nunca em dado de cliente sem o pedido dele.', dura: 'sempre' },
  { regra: 'Modelo novo entra primeiro como sugestão ao lado do jeito antigo, e só substitui depois de medida.', dura: 'sempre' },
  { regra: 'Agente não ganha permissão de escrever no banco de produção sem revisão humana no caminho.', dura: 'sempre' },
  { regra: 'Resultado que contraria o interesse comercial do Instituto é publicado do mesmo jeito.', dura: 'sempre' },
  { regra: 'Nenhuma análise de rosto, emoção, mentira ou perfil psicológico, em nenhuma linha de pesquisa.', dura: 'sempre' },
] as const

/** Seminário interno trimestral: quatro por ano, com data fixa e pauta mínima. */
export const SEMINARIO = {
  frequencia: 'trimestral',
  pautaMinima: [
    'O que foi medido no trimestre, com número.',
    'Que hipótese foi abandonada, e por quê.',
    'Que decisão de produto mudou por causa de uma medida.',
  ],
  proximos: ['2027-02-15', '2027-05-17', '2027-08-16', '2027-11-16'],
} as const

export const emAndamento = (): Linha[] => LINHAS.filter(l => l.estado === 'em_andamento')
export const semFalseador = (): Linha[] => LINHAS.filter(l => !l.invalidaria.trim())
export const semMedida = (): Linha[] => LINHAS.filter(l => !l.medida.trim())

/** Próximo seminário a partir de uma data, no formato ISO; null quando a lista acabou. */
export function proximoSeminario(hoje: string): string | null {
  return SEMINARIO.proximos.find(d => d >= hoje.slice(0, 10)) ?? null
}
