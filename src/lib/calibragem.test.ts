import { describe, it, expect } from 'vitest'
import { brier, curvaConfiabilidade, ece, eceIntervalo, casosPorFaixa, veredito, recalibradorIsotonico, combinarProbabilidades, type Par } from './calibragem'
import * as calib from './calibragem'

// Gerador reproduzível de casos perfeitamente calibrados: probabilidade p acontece com frequência p.
function calibrados(n: number, semente = 7): Par[] {
  let s = semente; const r = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 2 ** 32 }
  return Array.from({ length: n }, () => { const p = r(); return { p, y: r() < p ? 1 : 0 } })
}

describe('calibragem (B08)', () => {
  it('Brier e ECE de casos triviais', () => {
    expect(brier([])).toBeNull()
    expect(brier([{ p: 1, y: 1 }, { p: 0, y: 0 }])).toBe(0)
    expect(brier([{ p: 0.5, y: 1 }, { p: 0.5, y: 0 }])).toBe(0.25)
    expect(ece([{ p: 0.9, y: 0 }, { p: 0.9, y: 0 }])).toBeCloseTo(0.9)
  })
  it('curva separa faixas e inclui 100% na última', () => {
    const c = curvaConfiabilidade([{ p: 0.05, y: 0 }, { p: 1, y: 1 }, { p: 0.95, y: 1 }])
    expect(c.map(f => f.n)).toEqual([1, 2])
    expect(c[1].observado).toBe(1)
  })
  it('previsões calibradas com muitos casos ficam dentro da meta de 5%; poucas casos dão "amostra pequena"', () => {
    const muitos = calibrados(5000)
    const v = veredito(muitos)
    expect(v.ece!).toBeLessThan(0.03)
    expect(v.veredito).toBe('dentro da meta')
    expect(veredito(calibrados(15)).veredito).toBe('amostra pequena')
    expect(veredito([]).veredito).toBe('sem dados')
  })
  it('previsões exageradas (sempre 90%, acontece 50%) ficam fora da meta', () => {
    const ruins: Par[] = Array.from({ length: 400 }, (_, i) => ({ p: 0.9, y: (i % 2) as 0 | 1 }))
    expect(veredito(ruins).veredito).toBe('fora da meta')
  })
  it('intervalo do bootstrap é reproduzível e contém o ECE', () => {
    const d = calibrados(300)
    const a = eceIntervalo(d)!, b = eceIntervalo(d)!
    expect(a).toEqual(b)
    expect(a.min).toBeLessThanOrEqual(ece(d)! + 1e-9)
  })
  it('casos por faixa para ±5% com 95% de confiança', () => {
    expect(casosPorFaixa(0.05)).toBe(385)
    expect(casosPorFaixa(0.01)).toBe(9604)
  })
  it('recalibração isotônica corrige previsões exageradas e reduz o ECE', () => {
    const ruins: Par[] = Array.from({ length: 400 }, (_, i) => ({ p: i < 200 ? 0.9 : 0.2, y: (i < 200 ? (i % 2) : (i % 10 === 0 ? 1 : 0)) as 0 | 1 }))
    const f = recalibradorIsotonico(ruins)
    expect(f(0.9)).toBeCloseTo(0.5)
    expect(f(0.2)).toBeCloseTo(0.1)
    expect(ece(ruins.map(x => ({ p: f(x.p), y: x.y })))!).toBeLessThan(ece(ruins)!)
  })
})

describe('probabilidade única (B07)', () => {
  it('fontes iguais dão a mesma probabilidade; fonte com mais casos pesa mais', () => {
    expect(combinarProbabilidades([{ nome: 'a', p: 0.7, n: 10 }, { nome: 'b', p: 0.7, n: 1000 }])!.p).toBeCloseTo(0.7)
    const r = combinarProbabilidades([{ nome: 'DataJud', p: 0.9, n: 2500 }, { nome: 'Escritório', p: 0.5, n: 25 }])!
    expect(r.p).toBeGreaterThan(0.85)
    expect(r.pesos[0].peso).toBeCloseTo(50 / 55)
    expect(r.nTotal).toBe(2525)
  })
  it('sem fontes válidas devolve null', () => {
    expect(combinarProbabilidades([])).toBeNull()
    expect(combinarProbabilidades([{ nome: 'x', p: 0.5, n: 0 }])).toBeNull()
  })
})

import { probabilidadeUnica } from './previsaoInstituto'
describe('probabilidade única na tela do Instituto (B07)', () => {
  const r = { convencional: { p: 0.9, ic95: [0.88, 0.92] as [number, number], n: 2500 }, grafo: { p: 0.6 }, confianca: 'alta', placar_atual: '0x0', aviso: '', fonte: 'DataJud' }
  it('grafo fica com peso zero até vencer o placar', () => {
    const u = probabilidadeUnica(r)!
    expect(u.texto).toBe('Probabilidade única THEYE: 90,0%')
    expect(u.explicacao).toContain('grafo com peso 0')
  })
  it('com histórico do escritório, junta as duas fontes com peso pela amostra', () => {
    const u = probabilidadeUnica(r, false, { p: 0.5, n: 25 })!
    expect(u.explicacao).toContain('DataJud (Instituto) 91%')
    expect(u.explicacao).toContain('Histórico do escritório 9%')
  })
})

describe('B16: extremização só quando vence a linha de base', () => {
  const { extremizar, escolherExtremizacao } = calib
  it('a = 1 não muda nada; a > 1 afasta de 50%', () => {
    expect(extremizar(0.7)).toBeCloseTo(0.7, 6)
    expect(extremizar(0.7, 1.5)).toBeGreaterThan(0.7)
    expect(extremizar(0.3, 1.5)).toBeLessThan(0.3)
    expect(extremizar(0.5, 3)).toBeCloseTo(0.5, 6)
  })
  it('amostra pequena mantém a = 1 e diz por quê', () => {
    const r = escolherExtremizacao([{ p: 0.6, y: 1 }, { p: 0.4, y: 0 }])
    expect(r.a).toBe(1); expect(r.motivo).toContain('amostra pequena')
  })
  it('fontes tímidas (média de sinais independentes) ganham com a > 1; fontes já calibradas ficam em a = 1', () => {
    let s = 7
    const rnd = () => { s = (s * 48271) % 2147483647; return s / 2147483647 }
    const sigm = (x: number) => 1 / (1 + Math.exp(-x))
    const timidas: calib.Par[] = [], calibradas: calib.Par[] = []
    for (let i = 0; i < 2000; i++) {
      const z = (rnd() - 0.5) * 6 // verdade latente em log-odds
      const y: 0 | 1 = rnd() < sigm(z) ? 1 : 0
      calibradas.push({ p: sigm(z), y })
      timidas.push({ p: sigm(z / 2), y }) // média de fontes que só veem metade do sinal
    }
    const t = escolherExtremizacao(timidas)
    expect(t.a).toBeGreaterThan(1); expect(t.brier!).toBeLessThan(calib.brier(timidas)!)
    expect(escolherExtremizacao(calibradas).a).toBe(1)
  })
})
