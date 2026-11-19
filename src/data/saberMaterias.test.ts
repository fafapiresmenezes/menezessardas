// Prova do trilho v2 (P01-P12): o saber das 12 matérias com fonte, algoritmo de PI respeitado.
import { describe, it, expect } from 'vitest'
import { SABER_MATERIAS, saberDaRota } from './saberMaterias'

describe('saber das matérias nos ecrãs', () => {
  it('são 12 matérias e toda regra tem fonte https e texto próprio (nunca vazio ou curto demais)', () => {
    expect(SABER_MATERIAS.length).toBe(12)
    for (const m of SABER_MATERIAS) {
      expect(m.regras.length, m.id).toBeGreaterThanOrEqual(1)
      expect(m.rotas.length, m.id).toBeGreaterThanOrEqual(1)
      for (const r of m.regras) {
        expect(r.fonte.url, m.id).toMatch(/^https:\/\//)
        expect(r.fonte.nome.length, m.id).toBeGreaterThan(8)
        expect(r.texto.length, m.id).toBeGreaterThan(40)
      }
    }
  })

  it('obedece às palavras da casa: grafia de Angola, sem marca de cliente, sem promessa de previsão', () => {
    const t = JSON.stringify(SABER_MATERIAS)
    for (const re of [/imbono/i, /gemcorp/i, /jur[ií]dic/i, /\busu[aá]rio/i, /\btela\b/i, /\bprojetos?\b/, /\bsetor\b/]) {
      expect(t).not.toMatch(re)
    }
    expect(t.toLowerCase()).not.toContain('prevemos')
  })

  it('cada ecrã da casa encontra o seu saber', () => {
    for (const rota of ['/visao-presidente', '/contratos-obrigacoes', '/estudos-governo', '/riscos-litigios', '/demonstracao-obra']) {
      expect(saberDaRota(rota).length, rota).toBeGreaterThanOrEqual(1)
    }
    expect(saberDaRota('/estudos-governo').length).toBe(2) // M&E + eficácia da ajuda
    expect(saberDaRota('/rota-que-nao-existe')).toEqual([])
  })
})
