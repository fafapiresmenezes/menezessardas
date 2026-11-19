// Provas do modo de transporte (elo R5), com trajetos simulados: parado, andando e de carro.
import { describe, it, expect } from 'vitest'
import { classificarVelocidade, velocidades, suavizar, modosDosPontos, resumoDeModos, type Modo } from './modo'
import type { Ponto } from './calculo'

/** Gera um trajeto reto partindo de (0,0), com a velocidade pedida em m/s. */
function trajeto(n: number, mPorSeg: number, intervaloSeg = 10, informarVelocidade = false): Ponto[] {
  const grausPorMetro = 1 / 111320 // ~1 grau de latitude = 111,32 km
  return Array.from({ length: n }, (_, i) => ({
    t: i * intervaloSeg * 1000,
    lat: i * mPorSeg * intervaloSeg * grausPorMetro,
    lon: 0,
    precisao: 5,
    ...(informarVelocidade ? { velocidade: mPorSeg } : {}),
  })) as Ponto[]
}

describe('Classificação por velocidade (Reddy et al., ACM TOSN 2010)', () => {
  it('separa parado, a pé, bicicleta e veículo', () => {
    expect(classificarVelocidade(0.1)).toBe('parado')
    expect(classificarVelocidade(1.4)).toBe('a pé')      // ~5 km/h
    expect(classificarVelocidade(4.5)).toBe('bicicleta') // ~16 km/h
    expect(classificarVelocidade(15)).toBe('veículo')    // ~54 km/h
  })

  it('não inventa modo quando não há velocidade', () => {
    expect(classificarVelocidade(null)).toBe('indefinido')
    expect(classificarVelocidade(undefined)).toBe('indefinido')
    expect(classificarVelocidade(-3)).toBe('indefinido')
  })
})

describe('Velocidade a partir dos pontos', () => {
  it('calcula pela distância e pelo tempo quando o aparelho não informou', () => {
    const ps = trajeto(3, 10, 10) // 10 m/s
    const v = velocidades(ps)
    expect(v[0]).toBeNull()
    expect(v[1]!).toBeCloseTo(10, 1)
    expect(v[2]!).toBeCloseTo(10, 1)
  })

  it('usa a velocidade do aparelho quando ela existe', () => {
    const ps = trajeto(3, 2, 10, true)
    expect(velocidades(ps).every(v => v === 2)).toBe(true)
  })
})

describe('Suavização: um ponto solto não muda o modo', () => {
  it('o pico isolado de "veículo" no meio de uma caminhada some', () => {
    const m: Modo[] = ['a pé', 'a pé', 'veículo', 'a pé', 'a pé']
    expect(suavizar(m, 5)[2]).toBe('a pé')
  })

  it('uma mudança de verdade (sustentada) é mantida', () => {
    const m: Modo[] = ['a pé', 'a pé', 'veículo', 'veículo', 'veículo', 'veículo', 'veículo']
    expect(suavizar(m, 5)[5]).toBe('veículo')
  })
})

describe('Trajetos simulados de ponta a ponta', () => {
  it('parado em casa → parado', () => {
    const ps = Array.from({ length: 20 }, (_, i) => ({ t: i * 10000, lat: -22.9, lon: -43.2, precisao: 8 })) as Ponto[]
    expect(resumoDeModos(ps).predominante).toBe('parado')
  })

  it('caminhada a 1,4 m/s → a pé', () => {
    expect(resumoDeModos(trajeto(20, 1.4)).predominante).toBe('a pé')
  })

  it('bicicleta a 4,5 m/s → bicicleta', () => {
    expect(resumoDeModos(trajeto(20, 4.5)).predominante).toBe('bicicleta')
  })

  it('carro a 15 m/s → veículo', () => {
    expect(resumoDeModos(trajeto(20, 15)).predominante).toBe('veículo')
  })

  it('conta tempo e distância do trecho de carro', () => {
    // 20 pontos de 10 em 10 s a 15 m/s: 19 intervalos = 190 s ≈ 3,17 min e ≈ 2,85 km
    const r = resumoDeModos(trajeto(20, 15))
    const carro = r.porModo.find(x => x.modo === 'veículo')!
    expect(carro.minutos).toBeCloseTo(190 / 60, 1)
    expect(carro.km).toBeCloseTo(2.85, 1)
  })

  it('ignora buraco grande de tempo (aparelho desligado), em vez de contar como parado', () => {
    const ps: Ponto[] = [
      { t: 0, lat: 0, lon: 0, precisao: 5 },
      { t: 6 * 3600 * 1000, lat: 0, lon: 0, precisao: 5 }, // 6 h depois, mesmo lugar
    ] as Ponto[]
    const r = resumoDeModos(ps)
    const total = r.porModo.reduce((s, x) => s + x.minutos, 0)
    expect(total).toBe(0) // o buraco de 6 h não vira 360 min de "parado"
  })

  it('não quebra sem pontos', () => {
    expect(resumoDeModos([]).predominante).toBe('indefinido')
    expect(modosDosPontos([])).toEqual([])
  })
})
