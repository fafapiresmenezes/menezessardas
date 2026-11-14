// Erro #8: o caderno reorganizado em 6 famílias, pela dor do cliente (capítulo 10). Este teste trava
// a consistência: 21 fichas, 6 famílias, todo produto numa família, nomes sem sigla nem número de lei,
// e a escada de compra existe para cada família.
import { describe, it, expect } from 'vitest'
import { FAMILIAS, CADERNO, ESCADA, familiasComProdutos } from '@/data/caderno-familias'
import { PRODUTOS } from '@/data/produtos'

describe('caderno em 6 famílias pela dor do cliente (erro #8)', () => {
  it('tem exatamente 6 famílias e 21 fichas, uma por produto', () => {
    expect(FAMILIAS.length).toBe(6)
    expect(CADERNO.length).toBe(21)
    const nums = CADERNO.map(c => c.numero).sort((a, b) => a - b)
    expect(nums).toEqual(PRODUTOS.map(p => p.numero).sort((a, b) => a - b))
  })

  it('toda ficha está numa família conhecida', () => {
    const ids = new Set(FAMILIAS.map(f => f.id))
    for (const c of CADERNO) expect(ids.has(c.familia), `ficha ${c.numero}`).toBe(true)
  })

  it('nenhum nome de ficha tem sigla, número de lei ou valor em reais', () => {
    const ruins = CADERNO.filter(c => /\bR\$|\bLGPD\b|\bCNJ\b|\bESG\b|\d{2,}\/\d{4}/.test(c.nome)).map(c => c.numero)
    expect(ruins, `nomes com jargão: ${ruins.join(', ')}`).toEqual([])
  })

  it('cada família tem pelo menos uma ficha e uma escada de compra', () => {
    for (const f of familiasComProdutos()) {
      expect(f.fichas.length, f.nome).toBeGreaterThan(0)
      expect(ESCADA[f.id].entrada, f.nome).toBeTruthy()
      expect(ESCADA[f.id].principal, f.nome).toBeTruthy()
      expect(ESCADA[f.id].anual, f.nome).toBeTruthy()
    }
  })
})
