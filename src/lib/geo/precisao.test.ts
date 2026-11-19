// Provas das contas de precisão em campo (elo R10). Todas conferidas à mão.
import { describe, it, expect } from 'vitest'
import { COBERTURA_ESPERADA, PROTOCOLO, errosContra, mediana, notaDaPrecisao, percentil, porFaixa, resumir, type Leitura, type Referencia } from './precisao'
import { distancia } from './calculo'

// Ponto de referência fictício, só para a conta. Em campo, a coordenada vem do IBGE.
const ref: Referencia = { lat: -22.780000, lon: -43.310000, fonte: 'ponto de teste' }

/** Desloca o ponto de referência em metros para o norte, para montar um erro de tamanho conhecido. */
const aoNorte = (metros: number) => ref.lat + (metros / 111320)

const leitura = (metros: number, declarada: number, t = 1): Leitura =>
  ({ t, lat: aoNorte(metros), lon: ref.lon, precisao: declarada })

describe('mediana e percentil', () => {
  it('mediana de lista ímpar é o do meio; de par, a média dos dois do meio', () => {
    expect(mediana([3, 1, 2])).toBe(2)
    expect(mediana([1, 2, 3, 4])).toBe(2.5)
  })

  it('lista vazia não devolve zero (que mentiria): devolve NaN', () => {
    expect(Number.isNaN(mediana([]))).toBe(true)
    expect(Number.isNaN(percentil([], 0.9))).toBe(true)
  })

  it('o percentil 90 não interpola: devolve um valor que foi realmente medido', () => {
    const v = [1, 2, 3, 4, 5, 6, 7, 8, 9, 100]
    expect(percentil(v, 0.9)).toBe(9)
    expect(v).toContain(percentil(v, 0.9))
  })

  it('percentil 100 é o pior caso', () => {
    expect(percentil([5, 1, 50], 1)).toBe(50)
  })
})

describe('erro real contra o ponto de referência', () => {
  it('mede a distância em metros, e o deslocamento montado confere', () => {
    const e = errosContra([leitura(20, 30)], ref)
    expect(e[0].metros).toBeCloseTo(20, 0)
  })

  it('a margem declarada cobre quando é maior ou igual ao erro real', () => {
    expect(errosContra([leitura(20, 30)], ref)[0].coberta).toBe(true)
    expect(errosContra([leitura(40, 30)], ref)[0].coberta).toBe(false)
    // no limite, cobre
    const noLimite = errosContra([leitura(30, distancia({ lat: aoNorte(30), lon: ref.lon }, ref))], ref)
    expect(noLimite[0].coberta).toBe(true)
  })

  it('leitura exatamente sobre o ponto dá erro zero', () => {
    const e = errosContra([{ t: 1, lat: ref.lat, lon: ref.lon, precisao: 5 }], ref)
    expect(e[0].metros).toBeCloseTo(0, 5)
  })
})

describe('resumo da medição', () => {
  const erros = errosContra([
    leitura(5, 10, 1), leitura(8, 10, 2), leitura(12, 10, 3), leitura(40, 10, 4),
  ], ref)

  it('conta, mediana, p90 e pior caso', () => {
    const r = resumir(erros)!
    expect(r.n).toBe(4)
    expect(r.mediana).toBeCloseTo(10, 0)   // média de 8 e 12
    expect(r.pior).toBeCloseTo(40, 0)
  })

  it('cobertura é a fração de leituras em que a margem declarada segurou', () => {
    const r = resumir(erros)!
    expect(r.cobertura).toBeCloseTo(0.5, 2) // 5 e 8 cobertos; 12 e 40 não
  })

  it('aponta o aparelho OTIMISTA: declara menos do que erra', () => {
    const r = resumir(erros)!
    expect(r.declaradaMediana).toBe(10)
    expect(r.otimista).toBe(false) // mediana do erro ~10 = margem declarada 10
    const ruim = resumir(errosContra([leitura(50, 5, 1), leitura(60, 5, 2), leitura(70, 5, 3)], ref))!
    expect(ruim.otimista).toBe(true)
  })

  it('sem leitura nenhuma devolve null, não um resultado de fachada', () => {
    expect(resumir([])).toBeNull()
  })

  it('a cobertura esperada é 68%, porque é o que a margem declarada significa', () => {
    expect(COBERTURA_ESPERADA).toBeCloseTo(0.68, 2)
  })
})

describe('separação por faixa da margem declarada', () => {
  it('separa fina, média e grossa, e só mostra faixa que tem leitura', () => {
    const e = errosContra([leitura(4, 8, 1), leitura(6, 9, 2), leitura(25, 20, 3)], ref)
    const f = porFaixa(e)
    expect(f.map(x => x.faixa)).toEqual(['fina', 'media'])
    expect(f[0].resultado.n).toBe(2)
    expect(f[1].resultado.n).toBe(1)
  })

  it('margem grande cai na faixa grossa', () => {
    const f = porFaixa(errosContra([leitura(80, 120, 1)], ref))
    expect(f.map(x => x.faixa)).toEqual(['grossa'])
  })
})

describe('a nota da dimensão 8 sai da medição, nunca de opinião', () => {
  const comN = (n: number, metros: number, declarada: number) =>
    resumir(errosContra(Array.from({ length: n }, (_, i) => leitura(metros, declarada, i)), ref))

  it('menos de 30 leituras NÃO dá nota: é palpite, não medição', () => {
    expect(notaDaPrecisao(comN(29, 5, 10))).toBeNull()
    expect(notaDaPrecisao(null)).toBeNull()
  })

  it('erro mediano de até 10 m, com margem honesta, vale 10', () => {
    expect(notaDaPrecisao(comN(40, 6, 10))).toBe(10)
  })

  it('erro maior derruba a nota por faixa', () => {
    expect(notaDaPrecisao(comN(40, 15, 20))).toBe(8)
    expect(notaDaPrecisao(comN(40, 40, 50))).toBe(6)
    expect(notaDaPrecisao(comN(40, 80, 100))).toBe(4)
    expect(notaDaPrecisao(comN(40, 300, 400))).toBe(2)
  })

  it('aparelho que mente sobre a própria margem perde 2 pontos, mesmo errando pouco', () => {
    // erro mediano 8 m (valeria 10), mas o aparelho declarava só 3 m
    expect(notaDaPrecisao(comN(40, 8, 3))).toBe(8)
  })

  it('a nota nunca cai abaixo de 2', () => {
    expect(notaDaPrecisao(comN(40, 500, 5))).toBe(2)
  })
})

describe('o método fica escrito junto do resultado', () => {
  it('diz que a coordenada precisa de fonte', () => {
    expect(PROTOCOLO[0]).toMatch(/IBGE/)
    expect(PROTOCOLO[0]).toMatch(/[Ss]em fonte, não é referência/)
  })

  it('diz o mínimo de leituras e o tempo parado', () => {
    expect(PROTOCOLO.join(' ')).toMatch(/30 leituras/)
    expect(PROTOCOLO.join(' ')).toMatch(/5 minutos/)
  })

  it('manda repetir em outro dia, porque o céu muda', () => {
    expect(PROTOCOLO.join(' ')).toMatch(/outro dia/)
  })
})
