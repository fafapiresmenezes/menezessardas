// Passo C3: as contas da série de água. Nenhum teste aqui toca a rede nem o banco.
import { describe, it, expect } from 'vitest'
import { faixa, coordenadas, caminho, atrasoMedio, revisadas, variacao, diasSemDado, dataBr, numeroBr, GRANDEZAS, SEM_COLETA } from './agua'
import type { Ponto } from './agua'

const p = (dia: string, valor: number, extra: Partial<Ponto> = {}): Ponto => ({
  dia, valor, unidade: '%', observado_em: `${dia}T12:00:00-03:00`, revisoes: 0, atraso_horas: 12, ...extra,
})

describe('faixa e coordenadas', () => {
  it('a série plana não some: vira uma faixa com folga em volta', () => {
    const f = faixa([p('2026-11-01', 40), p('2026-11-02', 40)])
    expect(f.min).toBeLessThan(40)
    expect(f.max).toBeGreaterThan(40)
  })

  it('o maior valor fica no topo e o menor no pé do gráfico', () => {
    const c = coordenadas([p('2026-11-01', 10), p('2026-11-02', 50)], 100, 60)
    expect(c[0].y).toBeGreaterThan(c[1].y)   // no SVG, y maior é mais embaixo
    expect(c[0].x).toBe(0)
    expect(c[1].x).toBe(100)
  })

  it('um ponto só fica no meio, e não encostado na borda', () => {
    const c = coordenadas([p('2026-11-01', 10)], 100, 60)
    expect(c[0].x).toBe(50)
  })

  it('a série vazia não quebra a conta nem gera caminho', () => {
    expect(faixa([])).toEqual({ min: 0, max: 1 })
    expect(caminho([], 100, 60)).toBe('')
  })

  it('o caminho começa com M e segue com L, um por ponto', () => {
    const d = caminho([p('2026-11-01', 10), p('2026-11-02', 20), p('2026-11-03', 15)], 90, 30)
    expect(d.startsWith('M')).toBe(true)
    expect(d.match(/L/g)).toHaveLength(2)
  })
})

describe('honestidade da série', () => {
  it('conta os dias que a coleta não trouxe, em vez de desenhar linha contínua e mentir', () => {
    expect(diasSemDado([p('2026-11-01', 40), p('2026-11-03', 41)], '2026-11-01', '2026-11-05')).toBe(3)
    expect(diasSemDado([p('2026-11-01', 40)], '2026-11-01', '2026-11-01')).toBe(0)
  })

  it('mostra o atraso médio da informação e quantos dias a ANA já revisou', () => {
    const s = [p('2026-11-01', 40, { atraso_horas: 48, revisoes: 2 }), p('2026-11-02', 41, { atraso_horas: 24 })]
    expect(atrasoMedio(s)).toBe(36)
    expect(revisadas(s)).toBe(1)
    expect(atrasoMedio([])).toBeNull()
  })

  it('a variação sai na unidade da própria série, e com menos de dois pontos não existe', () => {
    expect(variacao([p('2026-11-01', 40), p('2026-11-02', 38.5)])).toEqual({ delta: -1.5, unidade: '%', sentido: 'desceu' })
    expect(variacao([p('2026-11-01', 40)])).toBeNull()
  })

  it('a frase de "ainda não coletado" diz onde a coleta roda, e não finge dado', () => {
    expect(SEM_COLETA).toContain('ana-agua')
    expect(SEM_COLETA).toContain('número inventado')
  })
})

describe('jeito brasileiro de escrever', () => {
  it('data em dia/mês/ano e número com vírgula', () => {
    expect(dataBr('2026-11-01T00:00:00-03:00')).toBe('01/11/2026')
    expect(numeroBr(1234.5)).toBe('1.234,5')
  })

  it('cada grandeza do SAR tem nome em português, unidade e explicação', () => {
    expect(GRANDEZAS).toHaveLength(4)
    for (const g of GRANDEZAS) {
      expect(g.nome.length).toBeGreaterThan(3)
      expect(g.unidade.length).toBeGreaterThan(0)
      expect(g.oque.endsWith('.')).toBe(true)
    }
  })
})
