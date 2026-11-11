import { describe, it, expect } from 'vitest'
import { janelas, lerOabs } from './historicoOab'

describe('janelas', () => {
  it('blocos de 30 dias colados, do mais recente ao mais antigo, sem falha nem repetição', () => {
    const j = janelas(3, new Date(2026, 10, 11))
    expect(j).toHaveLength(3)
    expect(j[0]).toEqual({ inicio: '2026-10-13', fim: '2026-11-11' })
    expect(j[1]).toEqual({ inicio: '2026-09-13', fim: '2026-10-12' })
    expect(j[2].fim).toBe('2026-09-12')
  })
  it('nunca passa de 93 dias por bloco e limita de 1 a 60 blocos', () => {
    expect(janelas(0)).toHaveLength(1)
    expect(janelas(500)).toHaveLength(60)
    for (const w of janelas(5)) expect((Date.parse(w.fim) - Date.parse(w.inicio)) / 86400000).toBe(29)
  })
})

describe('lerOabs', () => {
  it('normaliza número e estado, tira pontos e repetidas', () => {
    expect(lerOabs('123456/rj, 98.765 / SP; 123456/RJ\n007/mg')).toEqual({ oabs: ['123456/RJ', '98765/SP', '7/MG'], invalidas: [] })
  })
  it('devolve o que não deu para entender', () => {
    expect(lerOabs('abc, 123, 12345/RJ')).toEqual({ oabs: ['12345/RJ'], invalidas: ['abc', '123'] })
  })
  it('vazio não dá erro', () => {
    expect(lerOabs('  ')).toEqual({ oabs: [], invalidas: [] })
  })
})
