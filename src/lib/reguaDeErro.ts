// C19 (régua de erro): nenhuma previsão vale por si só — tem de ganhar do palpite simples e vir
// com a calibração à vista. "Palpite simples" é prever, para todo caso, a taxa histórica do grupo
// (sem olhar nenhum fator do caso) — o piso que qualquer modelo tem de superar para ser publicado.
import type { Par } from './calibragem'
import { brier } from './calibragem'

/** Palpite simples: a mesma taxa histórica (média observada) para todo caso, sem distinção. */
export function palpiteSimples(pares: Par[]): Par[] {
  if (!pares.length) return []
  const taxa = pares.reduce((s, x) => s + x.y, 0) / pares.length
  return pares.map(x => ({ p: taxa, y: x.y }))
}

export const MINIMO_PARA_COMPARAR = 20

export interface ComparacaoComBase {
  publicavel: boolean
  brierModelo: number | null
  brierBase: number | null
  n: number
  motivo: string
}

/** O modelo só é publicável quando ganha (Brier menor) do palpite simples, com amostra suficiente. */
export function comparacaoComBase(pares: Par[]): ComparacaoComBase {
  const n = pares.length
  if (n < MINIMO_PARA_COMPARAR) {
    return { publicavel: false, brierModelo: brier(pares), brierBase: null, n, motivo: `amostra pequena: ${n} desfechos, mínimo ${MINIMO_PARA_COMPARAR}` }
  }
  const bModelo = brier(pares)!
  const bBase = brier(palpiteSimples(pares))!
  const publicavel = bModelo < bBase
  return {
    publicavel, brierModelo: bModelo, brierBase: bBase, n,
    motivo: publicavel ? 'modelo ganhou do palpite simples' : 'modelo não ganhou do palpite simples: previsão não deve ser publicada',
  }
}

export const PISO_DE_CONFIANCA = 55

/** Direito de calar: entre o piso e seu espelho (perto de 50%), a plataforma diz "não sei" em vez de chutar. */
export function direitoDeCalar(chancePct: number | null): number | null {
  if (chancePct === null) return null
  const distanciaDoEmpate = Math.abs(chancePct - 50)
  return distanciaDoEmpate < PISO_DE_CONFIANCA - 50 ? null : chancePct
}
