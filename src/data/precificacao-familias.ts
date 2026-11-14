// Habilidade 3 do replanejamento de mercado (14/11/2026): régua de faixa mínima/máxima por família,
// a partir dos preços já existentes em precos-caderno.ts (erro #9 do planejamento). Não inventa
// preço novo: só lê os 21 valores já aprovados e calcula o piso e o teto de cada família.
//
// Preço aqui NUNCA decide por conta própria: a régua só documenta a faixa já existente e a regra de
// ajuste por tamanho da organização (ICP). Qualquer proposta de preço final ainda passa por revisão
// humana antes de ir ao cliente (capítulo 10 do planejamento, "quem assina").
import { FAMILIAS, CADERNO, type FamiliaId } from './caderno-familias'
import { PRECOS_CADERNO } from './precos-caderno'

/** Lê o valor em milhares de reais de uma string como "R$ 300 mil" ou "R$ 315 mil por turma". */
export const valorEmMilhares = (preco: string): number => {
  const m = preco.match(/R\$\s*([\d.,]+)\s*mil/i)
  if (!m) throw new Error(`Preço sem valor em milhares reconhecível: ${preco}`)
  return Number(m[1].replace(/\./g, '').replace(',', '.'))
}

export interface FaixaDePreco {
  familia: FamiliaId
  pisoMil: number
  tetoMil: number
  /** Números das fichas usadas para calcular o piso e o teto — nada inventado. */
  calculadaDe: number[]
}

export const FAIXAS_POR_FAMILIA: FaixaDePreco[] = FAMILIAS.map(f => {
  const fichas = CADERNO.filter(c => c.familia === f.id)
  const valores = fichas.map(c => ({ numero: c.numero, mil: valorEmMilhares(PRECOS_CADERNO[c.numero]) }))
  return {
    familia: f.id,
    pisoMil: Math.min(...valores.map(v => v.mil)),
    tetoMil: Math.max(...valores.map(v => v.mil)),
    calculadaDe: valores.map(v => v.numero),
  }
})

export const faixaDaFamilia = (f: FamiliaId): FaixaDePreco => {
  const faixa = FAIXAS_POR_FAMILIA.find(x => x.familia === f)
  if (!faixa) throw new Error(`Família sem faixa de preço: ${f}`)
  return faixa
}

/**
 * Regra de ajuste documentada (capítulo 10 + habilidade 1 — ICP): o preço final dentro da faixa
 * sobe com o tamanho típico da organização (ICP.tamanhoTipico) e com a urgência do sinal de dor,
 * nunca com o quanto o cliente "parece poder pagar" sem critério. A régua só define o intervalo
 * permitido; a pessoa que assina a proposta escolhe o ponto dentro dele, com justificativa escrita.
 */
export const REGRA_DE_AJUSTE =
  'O preço final fica entre o piso e o teto da família. Sobe com o tamanho da organização e a urgência do sinal de dor (ICP), nunca com uma estimativa de quanto o cliente pode pagar. Quem assina escolhe o ponto exato e escreve por quê, antes de enviar a proposta.'
