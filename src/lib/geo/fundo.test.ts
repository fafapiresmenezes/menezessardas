// Provas da gravação em segundo plano (elo R9). O que importa aqui é o que decide se um ponto
// entra no cofre: a peneira do intervalo e a conversão do que o aparelho entrega.
// O plugin em si só existe dentro do app Android, então não há o que provar dele aqui — o que se
// prova é que nada disso quebra ou grava lixo no navegador.
import { describe, it, expect, afterEach } from 'vitest'
import { AVISO_TEXTO, AVISO_TITULO, deveGravar, fundoDisponivel, paraPonto, recado } from './fundo'
import { Cofre, conferirCorrente } from './cofre'
import type { Ponto } from './calculo'

const leitura = (over: Record<string, unknown> = {}) => ({
  latitude: -22.78, longitude: -43.31, accuracy: 12, altitude: 20, altitudeAccuracy: 3,
  simulated: false, bearing: 90, speed: 1.4, time: 1_700_000_000_000, ...over,
}) as Parameters<typeof paraPonto>[0]

afterEach(() => { delete window.Capacitor })

describe('peneira do intervalo', () => {
  it('o primeiro ponto sempre entra', () => {
    expect(deveGravar(0, 1000, 60)).toBe(true)
  })

  it('ponto antes do intervalo escolhido não entra', () => {
    const t = 1_700_000_000_000
    expect(deveGravar(t, t + 59_000, 60)).toBe(false)
    expect(deveGravar(t, t + 60_000, 60)).toBe(true)
  })

  it('respeita o intervalo que o titular escolheu, não um fixo', () => {
    const t = 1_700_000_000_000
    expect(deveGravar(t, t + 20_000, 15)).toBe(true)
    expect(deveGravar(t, t + 20_000, 600)).toBe(false)
  })

  it('leitura repetida, com o mesmo horário, não entra duas vezes', () => {
    const t = 1_700_000_000_000
    expect(deveGravar(t, t, 15)).toBe(false)
  })

  it('relógio que anda para trás não grava, e também não tranca a gravação', () => {
    const t = 1_700_000_000_000
    expect(deveGravar(t, t - 5_000, 15)).toBe(false)
    expect(deveGravar(t, t + 20_000, 15)).toBe(true)
  })

  it('horário impossível (zero, negativo ou não número) não entra', () => {
    expect(deveGravar(0, 0, 60)).toBe(false)
    expect(deveGravar(0, -1, 60)).toBe(false)
    expect(deveGravar(0, Number.NaN, 60)).toBe(false)
  })
})

describe('conversão do que o aparelho entrega', () => {
  it('guarda posição, margem de erro, velocidade e bateria', () => {
    const p = paraPonto(leitura(), 0.73)
    expect(p).not.toBeNull()
    expect(p!.lat).toBeCloseTo(-22.78)
    expect(p!.precisao).toBe(12)
    expect(p!.velocidade).toBeCloseTo(1.4)
    expect(p!.bateria).toBeCloseTo(0.73)
  })

  it('posição SIMULADA por software é recusada: não entra na corrente como se fosse real', () => {
    expect(paraPonto(leitura({ simulated: true }), null)).toBeNull()
  })

  it('leitura sem horário é recusada', () => {
    expect(paraPonto(leitura({ time: null }), null)).toBeNull()
    expect(paraPonto(leitura({ time: 0 }), null)).toBeNull()
  })

  it('leitura sem coordenada é recusada', () => {
    expect(paraPonto(leitura({ latitude: Number.NaN }), null)).toBeNull()
  })

  it('aparelho que não informa velocidade grava null, nunca zero inventado', () => {
    expect(paraPonto(leitura({ speed: null }), null)!.velocidade).toBeNull()
  })
})

describe('o aviso ao titular', () => {
  it('o título da notificação diz quem está gravando e o quê, sem rodeio', () => {
    expect(AVISO_TITULO).toMatch(/THEYE Geo/)
    expect(AVISO_TITULO).toMatch(/posição/i)
  })

  it('o texto diz que dá para desligar e que o dado fica no aparelho', () => {
    expect(AVISO_TEXTO).toMatch(/desligar/i)
    expect(AVISO_TEXTO).toMatch(/neste aparelho/i)
  })

  it('erro do aparelho vira recado em português, sem código', () => {
    expect(recado({ code: 'NOT_AUTHORIZED' })).toMatch(/ajustes do THEYE Geo/)
    expect(recado({ code: 'NOT_AUTHORIZED' })).not.toMatch(/NOT_AUTHORIZED/)
    expect(recado({ code: 'NOT_AVAILABLE' })).toMatch(/GPS/)
    expect(recado({ message: 'timeout' })).toMatch(/timeout/)
  })
})

describe('no navegador comum', () => {
  it('a gravação de fundo não é oferecida', () => {
    expect(fundoDisponivel()).toBe(false)
  })

  it('dentro do app, é oferecida', () => {
    window.Capacitor = { isNativePlatform: () => true }
    expect(fundoDisponivel()).toBe(true)
  })
})

describe('confiabilidade: matar o app não perde ponto nem quebra a corrente (dim. 6)', () => {
  it('pontos de primeiro plano e de fundo, intercalados, formam UMA corrente íntegra', async () => {
    localStorage.clear()
    const c = await Cofre.abrir('senha-de-teste-r9')
    await c.consentir('M')
    const t0 = 1_700_000_000_000
    // Três pontos "de primeiro plano", depois três vindos do fundo pela mesma porta.
    for (let i = 0; i < 3; i++) {
      await c.gravarPonto({ t: t0 + i * 60_000, lat: -22.78 + i / 1000, lon: -43.31, precisao: 10 } as Ponto)
    }
    for (let i = 3; i < 6; i++) {
      const p = paraPonto(leitura({ time: t0 + i * 60_000, latitude: -22.78 + i / 1000 }), 0.5)
      await c.gravarPonto(p!)
    }
    expect(c.dados.pontos).toHaveLength(6)
    expect((await conferirCorrente(c.dados.pontos)).ok).toBe(true)

    // "Matar o app": o cofre é reaberto do zero, do que ficou gravado no aparelho.
    const depois = await Cofre.abrir('senha-de-teste-r9')
    expect(depois.dados.pontos).toHaveLength(6)
    expect((await conferirCorrente(depois.dados.pontos)).ok).toBe(true)
    // E a gravação continua do ponto em que parou, sem furo na corrente.
    const p = paraPonto(leitura({ time: t0 + 6 * 60_000 }), 0.5)
    await depois.gravarPonto(p!)
    expect((await conferirCorrente(depois.dados.pontos)).ok).toBe(true)
  })
})
