// Prova da régua de qualidade (trilho v2, P14): nada inventado, tudo com método e fonte.
import { describe, it, expect } from 'vitest'
import { REGUA_QUALIDADE } from './reguaQualidade'

describe('régua de qualidade', () => {
  it('tem os 11 parâmetros, cada um com meta, método e fonte https', () => {
    expect(REGUA_QUALIDADE.length).toBe(11)
    for (const p of REGUA_QUALIDADE) {
      expect(p.meta.length, p.id).toBeGreaterThan(5)
      expect(p.metodo.length, p.id).toBeGreaterThan(20)
      expect(p.fonte.url, p.id).toMatch(/^https:\/\//)
    }
  })

  it('não inventa nota: quem não tem valor está «por medir», quem tem valor tem data', () => {
    for (const p of REGUA_QUALIDADE) {
      if (p.valor === null) {
        expect(p.nota, p.id).toBe('por-medir')
        expect(p.dataMedicao, p.id).toBeNull()
      } else {
        expect(p.dataMedicao, p.id).toMatch(/^20\d\d-\d\d-\d\d$/)
        expect(p.nota, p.id).not.toBe('por-medir')
      }
    }
  })

  it('obedece às palavras da casa: grafia de Angola e nada de marca de cliente', () => {
    const t = JSON.stringify(REGUA_QUALIDADE)
    for (const re of [/imbono/i, /gemcorp/i, /jur[ií]dic/i, /\busu[aá]rio/i, /\btela\b/i, /\bprojetos?\b/, /\bsetor\b/]) {
      expect(t).not.toMatch(re)
    }
  })
})
