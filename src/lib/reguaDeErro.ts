// C19 (régua de erro): nenhuma previsão vale por si só — tem de ganhar do palpite simples e vir
// com a calibração à vista. "Palpite simples" é prever, para todo caso, a taxa histórica do grupo
// (sem olhar nenhum fator do caso) — o piso que qualquer modelo tem de superar para ser publicado.
import type { Par } from './calibragem'
import { brier } from './calibragem'

// ---------------------------------------------------------------- tarefa 1 (continuação, 15/11/2026):
// travar o registro da previsão antes de o resultado existir, para ninguém ajeitar o palpite depois
// de já saber o desfecho. Mesma receita do trilho (predicao/trilho-v4-andamento.jsonl): um hash
// amarra os dados selados no momento do registro, e qualquer alteração neles quebra o hash.
async function sha256Hex(texto: string): Promise<string> {
  const dados = new TextEncoder().encode(texto)
  const buffer = await crypto.subtle.digest('SHA-256', dados)
  return Array.from(new Uint8Array(buffer)).map(b => b.toString(16).padStart(2, '0')).join('')
}

export interface PrevisaoSelada {
  caso: string
  p: number // chance prevista (0-100), no momento do registro
  criadoEm: string // ISO 8601
  hashSelo: string // trava os três campos acima
}

export interface PrevisaoConferida extends PrevisaoSelada {
  y: 0 | 1 // desfecho real (0 = não aconteceu, 1 = aconteceu)
  conferidoEm: string
  hashConferencia: string // trava o desfecho em cima do selo original
}

/** Sela a previsão (caso, chance, data) ANTES de o desfecho existir. */
export async function registrarPrevisao(caso: string, p: number, quando: Date): Promise<PrevisaoSelada> {
  const criadoEm = quando.toISOString()
  const hashSelo = await sha256Hex(`${caso}|${p}|${criadoEm}`)
  return { caso, p, criadoEm, hashSelo }
}

/** Confere se o selo da previsão não foi mexido depois do registro. */
export async function seloIntacto(previsao: PrevisaoSelada): Promise<boolean> {
  const esperado = await sha256Hex(`${previsao.caso}|${previsao.p}|${previsao.criadoEm}`)
  return esperado === previsao.hashSelo
}

/** Registra o desfecho real em cima de uma previsão já selada. Falha se o selo foi mexido. */
export async function conferirPrevisao(previsao: PrevisaoSelada, y: 0 | 1, quando: Date): Promise<PrevisaoConferida> {
  if (!(await seloIntacto(previsao))) {
    throw new Error('O selo da previsão não bate com os dados — foi mexido depois do registro. Conferência recusada.')
  }
  const conferidoEm = quando.toISOString()
  const hashConferencia = await sha256Hex(`${previsao.hashSelo}|${y}|${conferidoEm}`)
  return { ...previsao, y, conferidoEm, hashConferencia }
}

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
