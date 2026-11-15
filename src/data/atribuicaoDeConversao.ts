// Habilidade 10 do replanejamento de mercado (14/11/2026): medição e atribuição — o que converteu
// e por quê. Fecha o ciclo das 10 habilidades: só faz sentido com 1 (segmentação), 4 (funil) e 9
// (canais) já no lugar. Mesma disciplina das habilidades anteriores: nunca aponta "o canal que
// converteu" sem base mínima de casos, e sempre avisa que é atribuição de um único toque (o
// primeiro canal registrado), não a jornada completa do cliente.
import { FAMILIAS, type FamiliaId } from './caderno-familias'

export interface RegistroDeOrigem {
  familia: FamiliaId
  canal: string
  convertido: boolean
}

export interface AtribuicaoPorCanal {
  canal: string
  total: number
  convertidos: number
  taxaDeConversao: number | null
}

const MINIMO_POR_CANAL = 5

/** Agrega conversão por canal dentro de uma família, sem misturar famílias diferentes. */
export function atribuicaoPorCanal(familia: FamiliaId, registros: RegistroDeOrigem[]): AtribuicaoPorCanal[] {
  const daFamilia = registros.filter(r => r.familia === familia)
  const canais = [...new Set(daFamilia.map(r => r.canal))]
  return canais.map(canal => {
    const doCanal = daFamilia.filter(r => r.canal === canal)
    const convertidos = doCanal.filter(r => r.convertido).length
    return {
      canal,
      total: doCanal.length,
      convertidos,
      taxaDeConversao: doCanal.length >= MINIMO_POR_CANAL ? convertidos / doCanal.length : null,
    }
  })
}

/**
 * Aponta o canal com maior taxa de conversão só quando há pelo menos um canal com base mínima de
 * casos (MINIMO_POR_CANAL). Nunca aponta vencedor com dado insuficiente — devolve null em vez de
 * arriscar um palpite.
 */
export function canalComMelhorConversao(familia: FamiliaId, registros: RegistroDeOrigem[]): AtribuicaoPorCanal | null {
  const comBase = atribuicaoPorCanal(familia, registros).filter(c => c.taxaDeConversao !== null)
  if (!comBase.length) return null
  return comBase.reduce((melhor, atual) => (atual.taxaDeConversao! > melhor.taxaDeConversao! ? atual : melhor))
}

export const canaisDeTodasAsFamilias = (registros: RegistroDeOrigem[]) =>
  FAMILIAS.map(f => ({ familia: f.id, melhorCanal: canalComMelhorConversao(f.id, registros) }))

/** Aviso permanente sobre o limite do método (capítulo 02: nunca esconder a limitação de um número). */
export const AVISO_ATRIBUICAO =
  'Isto é atribuição de um único toque (o primeiro canal registrado), não a jornada completa do cliente. Um canal com poucos casos não aparece como vencedor — a plataforma espera ter base suficiente antes de apontar qualquer um.'
