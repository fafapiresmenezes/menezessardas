// Habilidade 8 do replanejamento de mercado (14/11/2026): CAC/LTV sem gasto real de mídia.
import { describe, it, expect } from 'vitest'
import { FAMILIAS } from '@/data/caderno-familias'
import { faixaDaFamilia } from '@/data/precificacao-familias'
import { estimativasCacLtv, estimativaCacLtvDaFamilia, AVISO_CAC_LTV } from '@/data/cacLtv'

describe('CAC/LTV por família, sem gasto real de mídia (habilidade 8)', () => {
  it('toda família tem estimativa, com CAC máximo igual a um terço do LTV conservador', () => {
    const todas = estimativasCacLtv()
    expect(todas.length).toBe(FAMILIAS.length)
    for (const e of todas) {
      expect(e.cacMaximoMil).toBeCloseTo(e.ltvConservadorMil / 3, 6)
      expect(e.ticketMedioMil).toBeGreaterThan(0)
    }
  })

  it('o ticket médio é a média do piso e do teto já calculados na habilidade 3 (nada inventado)', () => {
    for (const f of FAMILIAS) {
      const faixa = faixaDaFamilia(f.id)
      const e = estimativaCacLtvDaFamilia(f.id)
      expect(e.ticketMedioMil).toBeCloseTo((faixa.pisoMil + faixa.tetoMil) / 2, 6)
    }
  })

  it('o aviso nunca promete gasto real: diz que a decisão é humana e que não é orçamento aprovado', () => {
    expect(AVISO_CAC_LTV).toMatch(/humana/)
    expect(AVISO_CAC_LTV).toMatch(/nunca um orçamento aprovado/)
  })
})
