// Provas do desenho do grafo (elo R6).
import { describe, it, expect } from 'vitest'
import { posicionar } from './layout'

const no = (id: string) => ({ id })
const dist = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y)

describe('Desenho do grafo (Fruchterman-Reingold)', () => {
  it('não devolve nada quando não há nó', () => {
    expect(posicionar([], [])).toEqual([])
  })

  it('um nó sozinho fica no meio', () => {
    const [p] = posicionar([no('a')], [], { largura: 400, altura: 200 })
    expect(p).toEqual({ id: 'a', x: 200, y: 100 })
  })

  it('todo nó cai dentro da caixa, com margem', () => {
    const nos = Array.from({ length: 30 }, (_, i) => no(`n${i}`))
    const arestas = nos.slice(1).map((n, i) => ({ de: nos[i].id, para: n.id }))
    for (const p of posicionar(nos, arestas, { largura: 600, altura: 400, margem: 10 })) {
      expect(p.x).toBeGreaterThanOrEqual(10)
      expect(p.x).toBeLessThanOrEqual(590)
      expect(p.y).toBeGreaterThanOrEqual(10)
      expect(p.y).toBeLessThanOrEqual(390)
    }
  })

  it('o mesmo grafo dá sempre o mesmo desenho (não dança ao reabrir)', () => {
    const nos = [no('a'), no('b'), no('c'), no('d')]
    const arestas = [{ de: 'a', para: 'b' }, { de: 'c', para: 'd' }]
    expect(posicionar(nos, arestas)).toEqual(posicionar(nos, arestas))
  })

  it('o que está ligado aparece mais perto do que o que não está', () => {
    // Dois pares ligados entre si, sem ligação entre os pares.
    const nos = [no('a'), no('b'), no('c'), no('d')]
    const arestas = [{ de: 'a', para: 'b' }, { de: 'c', para: 'd' }]
    const m = new Map(posicionar(nos, arestas, { largura: 600, altura: 600 }).map(p => [p.id, p]))
    const ligados = (dist(m.get('a')!, m.get('b')!) + dist(m.get('c')!, m.get('d')!)) / 2
    const soltos = (dist(m.get('a')!, m.get('c')!) + dist(m.get('b')!, m.get('d')!)) / 2
    expect(ligados).toBeLessThan(soltos)
  })

  it('ligação para um nó que não existe não quebra o desenho', () => {
    const p = posicionar([no('a'), no('b')], [{ de: 'a', para: 'fantasma' }], { largura: 300, altura: 300 })
    expect(p).toHaveLength(2)
    expect(p.every(q => Number.isFinite(q.x) && Number.isFinite(q.y))).toBe(true)
  })

  it('nós sem nenhuma ligação continuam com posição válida', () => {
    const p = posicionar([no('a'), no('b'), no('c')], [], { largura: 300, altura: 300 })
    expect(p.every(q => Number.isFinite(q.x) && Number.isFinite(q.y))).toBe(true)
    expect(new Set(p.map(q => `${Math.round(q.x)},${Math.round(q.y)}`)).size).toBe(3)
  })
})
