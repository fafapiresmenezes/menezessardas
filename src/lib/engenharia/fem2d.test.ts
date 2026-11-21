import { describe, it, expect } from 'vitest'
import { analisar, gerarTrelica, listaMateriaisTrelica, relatorioFEM, ErroFEM, type ModeloFEM } from './fem2d'

const E = 200e6, A = 0.01, I = 1e-4
const perto = (a: number, b: number, tol = 1e-6) => expect(Math.abs(a - b)).toBeLessThanOrEqual(tol * Math.max(1, Math.abs(b)))

describe('FEM 2D: casos de livro-texto (resultado fechado)', () => {
  it('viga biapoiada com carga uniforme: flecha 5wL⁴/384EI, M = wL²/8, reações wL/2', () => {
    const L = 6, w = -10
    // dividida em 4 barras para ter nó no meio do vão
    const nos = [0, 1, 2, 3, 4].map(k => ({ id: `N${k}`, x: (k * L) / 4, y: 0 }))
    const m: ModeloFEM = {
      nos,
      elementos: [0, 1, 2, 3].map(k => ({ id: `E${k}`, i: `N${k}`, j: `N${k + 1}`, E, A, I, w })),
      apoios: [{ no: 'N0', ux: true, uy: true }, { no: 'N4', uy: true }],
      cargas: [],
    }
    const r = analisar(m)
    perto(r.deslocamentos.N2.uy, (5 * w * L ** 4) / (384 * E * I))
    perto(r.reacoes.N0.fy, 30); perto(r.reacoes.N4.fy, 30)
    const mMax = Math.max(...r.elementos.map(e => e.Mmax))
    perto(mMax, (10 * L * L) / 8)
    expect(r.equilibrio.ok).toBe(true)
  })

  it('balanço com carga na ponta: flecha PL³/3EI, momento no engaste PL', () => {
    const L = 3, P = 20
    const m: ModeloFEM = {
      nos: [{ id: 'A', x: 0, y: 0 }, { id: 'B', x: L, y: 0 }],
      elementos: [{ id: 'E1', i: 'A', j: 'B', E, A, I }],
      apoios: [{ no: 'A', ux: true, uy: true, rz: true }],
      cargas: [{ no: 'B', fy: -P }],
    }
    const r = analisar(m)
    perto(r.deslocamentos.B.uy, (-P * L ** 3) / (3 * E * I))
    perto(r.deslocamentos.B.rz, (-P * L ** 2) / (2 * E * I))
    perto(r.reacoes.A.fy, P); perto(r.reacoes.A.mz, P * L)
    perto(r.elementos[0].Mmin, -P * L)
  })

  it('viga biengastada com carga uniforme: momentos wL²/12 nos apoios e wL²/24 no meio', () => {
    const L = 5, w = -12
    const m: ModeloFEM = {
      nos: [{ id: 'A', x: 0, y: 0 }, { id: 'B', x: L, y: 0 }],
      elementos: [{ id: 'E1', i: 'A', j: 'B', E, A, I, w }],
      apoios: [{ no: 'A', ux: true, uy: true, rz: true }, { no: 'B', ux: true, uy: true, rz: true }],
      cargas: [],
    }
    const r = analisar(m)
    perto(r.elementos[0].Mmin, -(12 * L * L) / 12)
    perto(r.elementos[0].Mmax, (12 * L * L) / 24)
  })

  it('barra axial: alongamento PL/EA e normal de tração', () => {
    const m: ModeloFEM = {
      nos: [{ id: 'A', x: 0, y: 0 }, { id: 'B', x: 0, y: 4 }],
      elementos: [{ id: 'T', i: 'A', j: 'B', E, A, tipo: 'trelica' }],
      apoios: [{ no: 'A', ux: true, uy: true }, { no: 'B', ux: true }],
      cargas: [{ no: 'B', fy: 100 }],
    }
    const r = analisar(m)
    perto(r.deslocamentos.B.uy, (100 * 4) / (E * A))
    perto(r.elementos[0].N, 100)
  })

  it('pórtico simples engastado com força horizontal: equilíbrio e simetria das reações verticais', () => {
    const h = 3, b = 4
    const m: ModeloFEM = {
      nos: [{ id: 'A', x: 0, y: 0 }, { id: 'B', x: 0, y: h }, { id: 'C', x: b, y: h }, { id: 'D', x: b, y: 0 }],
      elementos: [
        { id: 'P1', i: 'A', j: 'B', E, A, I }, { id: 'V', i: 'B', j: 'C', E, A, I }, { id: 'P2', i: 'D', j: 'C', E, A, I },
      ],
      apoios: [{ no: 'A', ux: true, uy: true, rz: true }, { no: 'D', ux: true, uy: true, rz: true }],
      cargas: [{ no: 'B', fx: 10 }],
    }
    const r = analisar(m)
    expect(r.equilibrio.ok).toBe(true)
    perto(r.reacoes.A.fx + r.reacoes.D.fx, -10)
    perto(r.reacoes.A.fy, -r.reacoes.D.fy)
    // momento em torno de A (anti-horário +): −10·h + Ry_D·b + Mz_A + Mz_D = 0
    perto(-10 * h + r.reacoes.D.fy * b + r.reacoes.A.mz + r.reacoes.D.mz, 0, 1e-6)
  })

  it('estrutura sem apoio suficiente é recusada como mecanismo', () => {
    const m: ModeloFEM = {
      nos: [{ id: 'A', x: 0, y: 0 }, { id: 'B', x: 2, y: 0 }],
      elementos: [{ id: 'E1', i: 'A', j: 'B', E, A, I }],
      apoios: [{ no: 'A', uy: true }],
      cargas: [{ no: 'B', fy: -1 }],
    }
    expect(() => analisar(m)).toThrow(ErroFEM)
  })
})

describe('treliça paramétrica', () => {
  it.each(['pratt', 'howe', 'warren'] as const)('%s: isostática, reações = metade da carga, banzo inferior tracionado no meio', tipo => {
    const p = { tipo, vao: 12, altura: 2, paineis: 6, cargaNo: 10, E, A }
    const { modelo, barras } = gerarTrelica(p)
    // isostática: barras + reações = 2 × nós
    expect(barras.length + 3).toBe(2 * modelo.nos.length)
    const r = analisar(modelo)
    const total = modelo.cargas.reduce((s, c) => s + Math.abs(c.fy ?? 0), 0)
    perto(r.reacoes.I0.fy, total / 2)
    perto(r.reacoes.I6.fy, total / 2)
    const meio = barras.find(b => b.papel === 'banzo inferior' && b.i === 'I3')!
    expect(r.elementos.find(e => e.id === meio.id)!.N).toBeGreaterThan(0)
  })

  it('Pratt: banzo inferior central confere com o método das seções (M/h)', () => {
    const { modelo, barras } = gerarTrelica({ tipo: 'pratt', vao: 12, altura: 2, paineis: 6, cargaNo: 10, E, A })
    const r = analisar(modelo)
    // 5 cargas de 10 kN nos nós S1..S5; reação 25 kN. Corte no painel I3–I4 (diagonal I3→S4): momentos em S4 (x = 8)
    const M = 25 * 8 - 10 * (2 + 4 + 6)
    const banzo = barras.find(b => b.papel === 'banzo inferior' && b.i === 'I3')!
    perto(r.elementos.find(e => e.id === banzo.id)!.N, M / 2)
    // diagonais de Pratt tracionadas sob gravidade
    const diagonais = barras.filter(b => b.papel === 'diagonal').map(b => r.elementos.find(e => e.id === b.id)!.N)
    expect(diagonais.every(n => n > 0)).toBe(true)
  })

  it('Howe: diagonais comprimidas', () => {
    const { modelo, barras } = gerarTrelica({ tipo: 'howe', vao: 12, altura: 2, paineis: 6, cargaNo: 10, E, A })
    const r = analisar(modelo)
    const diagonais = barras.filter(b => b.papel === 'diagonal').map(b => r.elementos.find(e => e.id === b.id)!.N)
    expect(diagonais.every(n => n < 0)).toBe(true)
  })

  it('lista de materiais soma os comprimentos e aplica a perda', () => {
    const { barras } = gerarTrelica({ tipo: 'warren', vao: 10, altura: 1.5, paineis: 5, cargaNo: 5, E, A: 0.002 })
    const lm = listaMateriaisTrelica(barras, 0.002, 5)
    const soma = barras.reduce((s, b) => s + b.L, 0)
    perto(lm.total.comprimento, soma)
    perto(lm.total.massaKg, soma * 0.002 * 7850 * 1.05)
  })

  it('Pratt com painéis ímpares é recusada', () => {
    expect(() => gerarTrelica({ tipo: 'pratt', vao: 10, altura: 2, paineis: 5, cargaNo: 1, E, A })).toThrow(ErroFEM)
  })
})

describe('memória de cálculo', () => {
  it('traz reações, equilíbrio e o aviso de assinatura', () => {
    const { modelo } = gerarTrelica({ tipo: 'pratt', vao: 8, altura: 2, paineis: 4, cargaNo: 10, E, A })
    const txt = relatorioFEM('Treliça teste', modelo, analisar(modelo), new Date('2026-11-21T00:00:00Z'))
    expect(txt).toContain('MEMÓRIA DE CÁLCULO: Treliça teste')
    expect(txt).toContain('2026-11-21')
    expect(txt).toContain('fecha')
    expect(txt).toMatch(/engenheiro habilitado/)
  })
})
