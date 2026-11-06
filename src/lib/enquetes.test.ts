import { describe, it, expect } from 'vitest'
import { wilson, margemMaxima, resumir, validar, aberta } from './enquetes'

describe('enquetes (B14): agregados honestos', () => {
  it('Wilson: n = 0 dá zero; 50/100 dá cerca de 40% a 60%; 0/10 não fica negativo', () => {
    expect(wilson(0, 0)).toEqual({ p: 0, min: 0, max: 0 })
    const w = wilson(50, 100)
    expect(w.p).toBe(0.5); expect(w.min).toBeCloseTo(0.404, 2); expect(w.max).toBeCloseTo(0.596, 2)
    expect(wilson(0, 10).min).toBe(0)
    expect(wilson(10, 10).max).toBe(1)
  })

  it('margem máxima: 100 votos ≈ 9,8 pontos; 385 votos ≈ 5 pontos; 0 votos = 100', () => {
    expect(margemMaxima(100)).toBe(9.8)
    expect(margemMaxima(385)).toBe(5)
    expect(margemMaxima(0)).toBe(100)
  })

  it('resumir: líder só quando os intervalos não se cruzam; empate técnico declarado; amostra pequena abaixo de 10', () => {
    const r = resumir(['Sim', 'Não', 'Depende'], { n: 200, contagens: [150, 30, 20] })
    expect(r.lider).toBe('Sim'); expect(r.empate).toBe(false); expect(r.amostraPequena).toBe(false)
    expect(r.linhas[0]).toMatchObject({ opcao: 'Sim', votos: 150 })
    const e = resumir(['A', 'B'], { n: 20, contagens: [11, 9] })
    expect(e.empate).toBe(true); expect(e.lider).toBeNull()
    const p = resumir(['A', 'B'], { n: 4, contagens: [4, 0] })
    expect(p.amostraPequena).toBe(true)
    expect(resumir(['A', 'B'], null)).toMatchObject({ n: 0, margem: 100, lider: null, empate: false, amostraPequena: true })
  })

  it('validar: tema, tamanho da pergunta, 2 a 6 opções sem repetição', () => {
    expect(validar({ tema: '', pergunta: 'Pergunta válida?', opcoes: ['a', 'b'] })).toContain('tema')
    expect(validar({ tema: 'LGPD', pergunta: 'curta', opcoes: ['a', 'b'] })).toContain('10 caracteres')
    expect(validar({ tema: 'LGPD', pergunta: 'Pergunta válida?', opcoes: ['a'] })).toContain('duas opções')
    expect(validar({ tema: 'LGPD', pergunta: 'Pergunta válida?', opcoes: ['a', 'A '] })).toContain('repetidas')
    expect(validar({ tema: 'LGPD', pergunta: 'Pergunta válida?', opcoes: ['1', '2', '3', '4', '5', '6', '7'] })).toContain('seis')
    expect(validar({ tema: 'LGPD', pergunta: 'Pergunta válida?', opcoes: ['Sim', 'Não'] })).toBeNull()
  })

  it('aberta: compara com o agora', () => {
    expect(aberta({ aberta_ate: '2030-01-01T00:00:00Z' }, new Date('2026-11-06'))).toBe(true)
    expect(aberta({ aberta_ate: '2026-01-01T00:00:00Z' }, new Date('2026-11-06'))).toBe(false)
  })
})
