// Provas das regras de nota medida pela máquina (elo R11).
import { describe, it, expect } from 'vitest'
import { EXPLICA_FONTE, conferir, notaAcessibilidade, notaManutencao } from './medicao'
import { RUBRICA } from '@/data/geo/nota'
import medicoes from '@/data/geo/medicoes-ci.json'

describe('nota de acessibilidade', () => {
  it('zero violação não dá 10 sozinha: o teto é 9 sem o Lighthouse medido', () => {
    expect(notaAcessibilidade(0)).toBe(9)
    expect(notaAcessibilidade(0, null)).toBe(9)
  })

  it('zero violação com Lighthouse ≥95 dá 10', () => {
    expect(notaAcessibilidade(0, 96)).toBe(10)
    expect(notaAcessibilidade(0, 94)).toBe(9)
  })

  it('violação derruba a nota por faixa', () => {
    expect(notaAcessibilidade(1)).toBe(7)
    expect(notaAcessibilidade(2)).toBe(7)
    expect(notaAcessibilidade(5)).toBe(5)
    expect(notaAcessibilidade(40)).toBe(3)
  })

  it('número sem sentido não vira nota boa', () => {
    expect(notaAcessibilidade(-1)).toBe(0)
    expect(notaAcessibilidade(Number.NaN)).toBe(0)
  })
})

describe('nota de manutenção', () => {
  it('todas as libs com teste dá 10; nenhuma, 3', () => {
    expect(notaManutencao(13, 13)).toBe(10)
    expect(notaManutencao(0, 13)).toBe(3)
  })

  it('a faixa do meio é a de hoje: 8 de 13 arquivos com teste vale 7', () => {
    expect(notaManutencao(8, 13)).toBe(7)
  })

  it('CI vermelho tranca a nota em 5, por mais teste que exista', () => {
    expect(notaManutencao(13, 13, false)).toBeLessThanOrEqual(5)
  })

  it('total zero não devolve nota de fachada', () => {
    expect(notaManutencao(0, 0)).toBe(0)
  })
})

describe('a conferência contra a régua', () => {
  const medicao = { quando: '2026-11-19', dimensoes: { '3': { nota: 9, valor: '0 violações', como: 'axe' } } }

  it('cala quando a régua bate com a medição', () => {
    expect(conferir(medicao, [{ n: 3, nota: 9 }])).toEqual([])
  })

  it('acusa, em português, quando a régua diz um número e a medição dá outro', () => {
    const p = conferir(medicao, [{ n: 3, nota: 10 }])
    expect(p).toHaveLength(1)
    expect(p[0]).toContain('a régua diz 10 e a medição deu 9')
  })

  it('acusa dimensão medida que não existe na régua', () => {
    expect(conferir(medicao, [{ n: 1, nota: 7 }])[0]).toContain('não existe na régua')
  })

  it('as dimensões medidas pela máquina batem com a última medição gravada', () => {
    // esta é a prova que importa: se alguém mexer na nota 3 ou 9 à mão, cai aqui.
    // A mesma conferência roda no CI, contra uma medição feita na hora.
    expect(conferir(medicoes as never, RUBRICA)).toEqual([])
  })

  it('as duas regras medidas continuam valendo para os números de hoje', () => {
    expect(RUBRICA.find(d => d.n === 3)!.nota).toBe(notaAcessibilidade(0))
    expect(RUBRICA.find(d => d.n === 9)!.nota).toBe(notaManutencao(9, 14))
  })

  it('só as dimensões marcadas como medidas pela máquina aparecem na medição', () => {
    const doCI = RUBRICA.filter(d => d.fonte === 'ci').map(d => String(d.n)).sort()
    expect(Object.keys(medicoes.dimensoes).sort()).toEqual(doCI)
  })
})

describe('o painel explica de onde vem cada nota', () => {
  it('as três origens estão escritas em palavras do dia a dia', () => {
    expect(EXPLICA_FONTE.ci).toMatch(/a máquina mede/)
    expect(EXPLICA_FONTE.manual).toMatch(/à mão/)
    expect(EXPLICA_FONTE.externo).toMatch(/em vez de fingir/)
  })
})
