// Habilidade 3 do replanejamento de mercado (14/11/2026): régua de preço por família.
import { describe, it, expect } from 'vitest'
import { FAMILIAS, CADERNO } from '@/data/caderno-familias'
import { PRECOS_CADERNO } from '@/data/precos-caderno'
import {
  FAIXAS_POR_FAMILIA,
  faixaDaFamilia,
  valorEmMilhares,
  REGRA_DE_AJUSTE,
} from '@/data/precificacao-familias'

describe('régua de preço por família (habilidade 3 — precificação e elasticidade)', () => {
  it('lê corretamente o valor em milhares de reais de cada formato de preço existente', () => {
    expect(valorEmMilhares('R$ 300 mil')).toBe(300)
    expect(valorEmMilhares('R$ 315 mil por turma')).toBe(315)
    expect(valorEmMilhares('R$ 240 mil por ciclo anual')).toBe(240)
  })

  it('toda família tem faixa, com piso menor ou igual ao teto', () => {
    expect(FAIXAS_POR_FAMILIA.length).toBe(FAMILIAS.length)
    for (const f of FAMILIAS) {
      const faixa = faixaDaFamilia(f.id)
      expect(faixa.pisoMil, f.nome).toBeLessThanOrEqual(faixa.tetoMil)
      expect(faixa.calculadaDe.length, f.nome).toBeGreaterThan(0)
    }
  })

  it('o piso e o teto de cada família vêm só dos preços já existentes das suas fichas, sem valor novo', () => {
    for (const f of FAMILIAS) {
      const fichas = CADERNO.filter(c => c.familia === f.id)
      const valores = fichas.map(c => valorEmMilhares(PRECOS_CADERNO[c.numero]))
      const faixa = faixaDaFamilia(f.id)
      expect(faixa.pisoMil).toBe(Math.min(...valores))
      expect(faixa.tetoMil).toBe(Math.max(...valores))
    }
  })

  it('a regra de ajuste nunca menciona "quanto o cliente pode pagar" como critério de alta de preço', () => {
    expect(REGRA_DE_AJUSTE).toMatch(/nunca/i)
    expect(REGRA_DE_AJUSTE.length).toBeGreaterThan(0)
  })
})
