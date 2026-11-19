// Provas das métricas de mobilidade (elo R4). Cada número conferido contra conta feita à mão,
// não contra o próprio código — senão o teste só repetiria o erro.
import { describe, it, expect } from 'vitest'
import { distancia } from './calculo'
import {
  raioDeGiracao, entropiaAleatoria, entropiaNaoCorrelacionada, entropiaReal,
  previsibilidadeMaxima, perfilDeMobilidade, confianca, metricasDeMobilidade,
} from './mobilidade'
import type { Lugar, Ponto } from './calculo'

const lugar = (id: string, lat: number, lon: number, visitas: number): Lugar =>
  ({ id, lat, lon, nome: '', visitas, minutos: visitas * 30 })
const ponto = (t: number, lat: number, lon: number): Ponto =>
  ({ t, lat, lon, precisao: 10 } as Ponto)

describe('Raio de giração (González et al., Nature 2008)', () => {
  it('com dois pontos, é exatamente metade da distância entre eles', () => {
    // À mão: o centro de massa cai no meio, cada ponto fica a D/2 dele,
    // então r_g = raiz(((D/2)² + (D/2)²)/2) = D/2.
    const a = { lat: 0, lon: 0 }, b = { lat: 0, lon: 0.01 }
    const esperado = distancia(a, b) / 2 / 1000
    expect(raioDeGiracao([a, b])).toBeCloseTo(esperado, 6)
  })

  it('é zero quando a pessoa não saiu do lugar', () => {
    expect(raioDeGiracao([{ lat: -22.9, lon: -43.2 }, { lat: -22.9, lon: -43.2 }])).toBeCloseTo(0, 9)
  })
})

describe('Entropias (Song et al., Science 2010)', () => {
  it('S_rand = log2(N)', () => {
    expect(entropiaAleatoria(2)).toBeCloseTo(1, 9)
    expect(entropiaAleatoria(8)).toBeCloseTo(3, 9)
  })

  it('S_unc de dois lugares meio a meio = 1 bit', () => {
    expect(entropiaNaoCorrelacionada(['a', 'a', 'b', 'b'])).toBeCloseTo(1, 9)
  })

  it('S_unc é zero quando só existe um lugar', () => {
    expect(entropiaNaoCorrelacionada(['a', 'a', 'a'])).toBeCloseTo(0, 9)
  })

  it('S_real pelo Lempel-Ziv bate com a conta à mão', () => {
    // seq = a,a,a,a (n=4). Λ: i=0 →1; i=1 →2; i=2 →3 (nada novo cabe); i=3 →2. Soma = 8.
    // S = n·log2(n)/ΣΛ = 4·2/8 = 1
    expect(entropiaReal(['a', 'a', 'a', 'a'])).toBeCloseTo(1, 9)
  })
})

describe('Previsibilidade máxima (Fano, em Song et al. 2010)', () => {
  it('com 2 lugares e entropia no máximo (1 bit), o teto cai para o acaso: 50%', () => {
    // f(p) = H(p) quando N=2; H(0,5) = 1 → Π = 0,5
    expect(previsibilidadeMaxima(1, 2)).toBeCloseTo(0.5, 4)
  })

  it('entropia zero significa totalmente previsível', () => {
    expect(previsibilidadeMaxima(0, 5)).toBeCloseTo(1, 9)
  })

  it('nunca passa de 1 nem fica abaixo de 1/N', () => {
    const p = previsibilidadeMaxima(0.4, 4)
    expect(p).toBeGreaterThanOrEqual(0.25)
    expect(p).toBeLessThanOrEqual(1)
  })
})

describe('Retornante ou explorador (Pappalardo et al., Nat. Commun. 2015)', () => {
  it('quem só vai aos dois lugares de sempre é retornante', () => {
    const ls = [lugar('casa', 0, 0, 100), lugar('trabalho', 0, 0.05, 100), lugar('raro', 0, 0.051, 1)]
    const r = perfilDeMobilidade(ls)
    expect(r.perfil).toBe('retornante')
    expect(r.razao).toBeGreaterThanOrEqual(0.5)
  })

  it('quem se espalha por muitos lugares distantes é explorador', () => {
    const ls = [lugar('a', 0, 0, 10), lugar('b', 0, 0.001, 10), lugar('c', 0, 1, 9), lugar('d', 0, -1, 9)]
    expect(perfilDeMobilidade(ls).perfil).toBe('explorador')
  })

  it('sem lugares suficientes, não inventa perfil', () => {
    expect(perfilDeMobilidade([lugar('a', 0, 0, 3)]).perfil).toBe('indefinido')
  })
})

describe('Honestidade: confiança conforme o tanto de dado', () => {
  it('com pouco dado avisa que a conta ainda não vale muito', () => {
    expect(confianca(10, 1).nivel).toBe('baixa')
  })
  it('com bastante dado, sobe', () => {
    expect(confianca(5000, 12).nivel).toBe('boa')
  })
})

describe('Métricas juntas', () => {
  it('monta o painel inteiro sem quebrar com pouco dado', () => {
    const m = metricasDeMobilidade([ponto(1, 0, 0), ponto(2, 0, 0.01)], [lugar('a', 0, 0, 1)], ['a', 'a'])
    expect(m.nPontos).toBe(2)
    expect(m.confianca.nivel).toBe('baixa')
    expect(m.previsibilidadeMaxima).toBeLessThanOrEqual(1)
    expect(Number.isFinite(m.raioGiracaoKm)).toBe(true)
  })

  it('não quebra com nenhum dado', () => {
    const m = metricasDeMobilidade([], [], [])
    expect(m.raioGiracaoKm).toBe(0)
    expect(m.confianca.nivel).toBe('baixa')
  })
})
