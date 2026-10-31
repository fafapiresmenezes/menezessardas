import { describe, expect, it } from 'vitest'
import { TOURS, tourDaRota } from '@/data/tours'

describe('tours por tela', () => {
  it('toda tela tem exatamente 3 passos com título e texto curtos', () => {
    for (const [rota, t] of Object.entries(TOURS)) {
      expect(t.passos, rota).toHaveLength(3)
      for (const p of t.passos) { expect(p.titulo.length).toBeLessThan(40); expect(p.texto.length).toBeLessThan(200) }
    }
  })
  it('acha o tour pela rota e por sub-rotas', () => {
    expect(tourDaRota('/imoveis')?.nome).toBe('Imóveis'); expect(tourDaRota('/imoveis/novo')?.nome).toBe('Imóveis'); expect(tourDaRota('/login')).toBeNull()
  })
})
