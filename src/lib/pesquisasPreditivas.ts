/**
 * Jogo da Moeda do Olho (antes chamado de estalecas) da frente de Predição (pedido de M, 20/11/2026).
 *
 * O que é, nesta fase: uma pesquisa de opinião em formato de mercado de previsões. Cada membro do
 * Instituto recebe pontos de pesquisa e usa esses pontos para dizer em que resultado acredita. A soma
 * dos pontos em cada resposta vira a "chance que o grupo vê". Quando a pergunta se resolve, quem
 * acertou recebe de volta os pontos da rodada, na proporção do que colocou.
 *
 * O que NÃO é, de propósito: os pontos não valem dinheiro, não se compram, não se vendem, não se
 * trocam por nada, não viram token negociável e não saem da plataforma. Não há depósito nem saque.
 * Qualquer passo com dinheiro real depende de licença e de advogado (ver o mapa jurídico na tela).
 *
 * As contas abaixo são puras (sem banco) para serem testadas e para a tela funcionar em demonstração
 * antes de o SQL 155 ser colado. O banco repete as mesmas contas nas funções do SQL.
 */

export const PONTOS_INICIAIS = 1000
export const PONTOS_MINIMO = 1
export const PONTOS_MAXIMO_POR_PALPITE = 200
/**
 * Moeda do Olho (pedido de M, 20/11/2026 01h05): crédito interno para limitar o jogo. Recarga grátis
 * toda semana, sem compra, sem saque, sem transferência e sem conversão em nada.
 */
export const RECARGA_SEMANAL = 100
/** Primeira recarga: segunda-feira 23/11/2026, 00h de Brasília. Depois, toda segunda nesse horário. */
export const INICIO_DAS_RECARGAS = '2026-11-23T03:00:00Z'
const SEMANA_MS = 7 * 24 * 60 * 60 * 1000

/** Quantas recargas semanais já caíram até agora (0 antes da primeira). */
export function recargasAte(agora = new Date()): number {
  const d = agora.getTime() - new Date(INICIO_DAS_RECARGAS).getTime()
  return d < 0 ? 0 : Math.floor(d / SEMANA_MS) + 1
}

export interface Pergunta {
  id: number
  titulo: string
  detalhe: string
  categoria: string
  opcoes: string[]
  /** Como a pergunta será resolvida e por qual fonte pública. Obrigatório: sem fonte não há pergunta. */
  criterio: string
  fecha_em: string
  /** Índice da opção que aconteceu; -1 = anulada (pontos devolvidos); null = ainda aberta. */
  resultado: number | null
  resolvida_em: string | null
}

export interface Palpite {
  pergunta_id: number
  opcao: number
  pontos: number
}

/** Pontos colocados em cada opção, somando todos os palpites da pergunta. */
export function poteDaPergunta(p: Pick<Pergunta, 'id' | 'opcoes'>, palpites: Palpite[]): number[] {
  const pote = p.opcoes.map(() => 0)
  for (const x of palpites) {
    if (x.pergunta_id !== p.id) continue
    if (x.opcao >= 0 && x.opcao < pote.length) pote[x.opcao] += x.pontos
  }
  return pote
}

/**
 * Chance que o grupo vê em cada opção, em porcentagem inteira. Sem nenhum ponto colocado, a tela
 * mostra a divisão igual (50/50 numa pergunta de Sim ou Não) e avisa que ainda não há opinião.
 */
export function chancesDoGrupo(pote: number[]): number[] {
  const total = pote.reduce((a, b) => a + b, 0)
  if (total === 0) return pote.map(() => Math.round(100 / pote.length))
  return pote.map(v => Math.round((v / total) * 100))
}

/** Quanto um palpite devolve quando a pergunta se resolve (rateio entre quem acertou). */
export function retornoDoPalpite(palpite: Palpite, pote: number[], resultado: number | null): number {
  if (resultado === null) return 0
  if (resultado === -1) return palpite.pontos
  if (palpite.opcao !== resultado) return 0
  const total = pote.reduce((a, b) => a + b, 0)
  const vencedor = pote[resultado] ?? 0
  if (vencedor === 0) return palpite.pontos
  return Math.floor((palpite.pontos * total) / vencedor)
}

/** Saldo de uma pessoa: os iniciais, mais as recargas semanais, menos o que está colocado, mais o que voltou. */
export function saldoDePontos(perguntas: Pergunta[], todos: Palpite[], meus: Palpite[], agora = new Date()): number {
  let saldo = PONTOS_INICIAIS + RECARGA_SEMANAL * recargasAte(agora)
  for (const m of meus) {
    saldo -= m.pontos
    const p = perguntas.find(q => q.id === m.pergunta_id)
    if (!p) continue
    saldo += retornoDoPalpite(m, poteDaPergunta(p, todos), p.resultado)
  }
  return saldo
}

export function aberta(p: Pergunta, agora = new Date()): boolean {
  return p.resultado === null && new Date(p.fecha_em).getTime() > agora.getTime()
}

/** Confere um palpite antes de gravar. Devolve o motivo do erro em palavras simples, ou null. */
export function validarPalpite(p: Pergunta, opcao: number, pontos: number, saldo: number, agora = new Date()): string | null {
  if (!aberta(p, agora)) return 'Esta pergunta já fechou.'
  if (!Number.isInteger(opcao) || opcao < 0 || opcao >= p.opcoes.length) return 'Escolha uma das respostas.'
  if (!Number.isInteger(pontos) || pontos < PONTOS_MINIMO) return 'Coloque pelo menos 1 moeda do olho.'
  if (pontos > PONTOS_MAXIMO_POR_PALPITE) return `No máximo ${PONTOS_MAXIMO_POR_PALPITE} moedas do olho por palpite.`
  if (pontos > saldo) return 'Você não tem moedas do olho suficientes.'
  return null
}

/** Confere uma pergunta nova. Toda pergunta precisa de critério com fonte pública e data de fechamento futura. */
export function validarPergunta(n: { titulo: string; criterio: string; opcoes: string[]; fecha_em: string }, agora = new Date()): string | null {
  if (n.titulo.trim().length < 10) return 'Escreva a pergunta inteira (pelo menos 10 letras).'
  if (n.criterio.trim().length < 15) return 'Diga como e por qual fonte pública a pergunta será resolvida.'
  const ops = n.opcoes.map(o => o.trim()).filter(Boolean)
  if (ops.length < 2) return 'A pergunta precisa de pelo menos duas respostas.'
  if (new Set(ops.map(o => o.toLowerCase())).size !== ops.length) return 'Há respostas repetidas.'
  const t = new Date(n.fecha_em).getTime()
  if (!Number.isFinite(t) || t <= agora.getTime()) return 'A data de fechamento tem de ser no futuro.'
  return null
}

/**
 * Dado da pesquisa: o quanto o grupo acertou. Para cada pergunta resolvida (não anulada), compara a
 * chance que o grupo dava à opção que aconteceu com o resultado. Índice de Brier: 0 é perfeito, 0,25 é
 * o mesmo que chutar 50/50 numa pergunta de Sim ou Não, 1 é errar tudo com certeza total.
 * Só aparece com pelo menos `minimo` perguntas resolvidas, para não vender acaso como acerto.
 */
export function acertoDoGrupo(perguntas: Pergunta[], todos: Palpite[], minimo = 5): { n: number; brier: number | null } {
  const resolvidas = perguntas.filter(p => p.resultado !== null && p.resultado >= 0)
  const notas: number[] = []
  for (const p of resolvidas) {
    const pote = poteDaPergunta(p, todos)
    const total = pote.reduce((a, b) => a + b, 0)
    if (total === 0) continue
    let soma = 0
    pote.forEach((v, i) => {
      const prob = v / total
      const aconteceu = i === p.resultado ? 1 : 0
      soma += (prob - aconteceu) ** 2
    })
    notas.push(soma / pote.length)
  }
  if (notas.length < minimo) return { n: notas.length, brier: null }
  return { n: notas.length, brier: notas.reduce((a, b) => a + b, 0) / notas.length }
}

/** Perguntas de exemplo para a tela em demonstração (antes do SQL 155). Nada disto é gravado. */
export const PERGUNTAS_EXEMPLO: Pergunta[] = [
  {
    id: -1,
    titulo: 'A taxa Selic estará acima de 12% ao ano na última reunião do Copom de 2026?',
    detalhe: 'Pergunta de exemplo para mostrar como a tela funciona.',
    categoria: 'Economia',
    opcoes: ['Sim', 'Não'],
    criterio: 'Comunicado oficial do Copom no site do Banco Central (bcb.gov.br) na data da última reunião do ano.',
    fecha_em: '2026-12-31T23:59:00Z',
    resultado: null,
    resolvida_em: null,
  },
  {
    id: -2,
    titulo: 'O volume útil do reservatório equivalente do Paraíba do Sul estará acima de 50% em 31/01/2027?',
    detalhe: 'Pergunta de exemplo ligada à frente de Águas.',
    categoria: 'Águas',
    opcoes: ['Sim', 'Não'],
    criterio: 'Boletim diário de reservatórios da ANA (SAR) publicado para 31/01/2027.',
    fecha_em: '2027-01-31T23:59:00Z',
    resultado: null,
    resolvida_em: null,
  },
  {
    id: -3,
    titulo: 'Qual será a faixa do IPCA acumulado de 2026 divulgado pelo IBGE?',
    detalhe: 'Pergunta de exemplo com mais de duas respostas.',
    categoria: 'Economia',
    opcoes: ['Abaixo de 4%', 'De 4% a 5%', 'Acima de 5%'],
    criterio: 'Divulgação oficial do IPCA de dezembro de 2026 no site do IBGE (ibge.gov.br).',
    fecha_em: '2027-01-15T23:59:00Z',
    resultado: null,
    resolvida_em: null,
  },
]
