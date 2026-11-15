import { describe, it, expect } from 'vitest'
import type { Par } from './calibragem'
import { palpiteSimples, comparacaoComBase, direitoDeCalar, MINIMO_PARA_COMPARAR, PISO_DE_CONFIANCA, registrarPrevisao, seloIntacto, conferirPrevisao } from './reguaDeErro'

describe('reguaDeErro', () => {
  it('o palpite simples usa a mesma taxa histórica para todo caso', () => {
    const pares: Par[] = [{ p: 0.9, y: 1 }, { p: 0.9, y: 1 }, { p: 0.9, y: 0 }, { p: 0.9, y: 0 }]
    const base = palpiteSimples(pares)
    expect(base.every(x => x.p === 0.5)).toBe(true)
    expect(base.map(x => x.y)).toEqual(pares.map(x => x.y))
  })

  it(`não é publicável com menos de ${MINIMO_PARA_COMPARAR} desfechos`, () => {
    const pares: Par[] = Array.from({ length: 5 }, (_, i) => ({ p: 0.8, y: (i % 2) as 0 | 1 }))
    const r = comparacaoComBase(pares)
    expect(r.publicavel).toBe(false)
    expect(r.motivo).toMatch(/amostra pequena/)
  })

  it('não é publicável quando o modelo não ganha do palpite simples (modelo ruim e disperso)', () => {
    const pares: Par[] = Array.from({ length: MINIMO_PARA_COMPARAR }, (_, i) => ({ p: i % 2 === 0 ? 0.95 : 0.05, y: 1 as const }))
    const r = comparacaoComBase(pares)
    expect(r.publicavel).toBe(false)
  })

  it('é publicável quando o modelo tem Brier menor que o palpite simples', () => {
    // Metade dos casos termina 1, metade termina 0 (taxa histórica 50%, palpite simples sempre 50%);
    // o modelo acerta a direção de cada caso (0.9 quando termina 1, 0.1 quando termina 0) e por isso ganha.
    const pares: Par[] = [
      ...Array.from({ length: MINIMO_PARA_COMPARAR / 2 }, () => ({ p: 0.9, y: 1 as const })),
      ...Array.from({ length: MINIMO_PARA_COMPARAR / 2 }, () => ({ p: 0.1, y: 0 as const })),
    ]
    const r = comparacaoComBase(pares)
    expect(r.publicavel).toBe(true)
    expect(r.brierModelo).toBeLessThan(r.brierBase!)
  })

  it(`cala (devolve null) perto do empate, dentro do piso de confiança (${PISO_DE_CONFIANCA})`, () => {
    expect(direitoDeCalar(50)).toBeNull()
    expect(direitoDeCalar(52)).toBeNull()
    expect(direitoDeCalar(48)).toBeNull()
  })

  it('fala quando a chance está fora da zona de empate', () => {
    expect(direitoDeCalar(70)).toBe(70)
    expect(direitoDeCalar(30)).toBe(30)
  })

  it('devolve null quando não há chance calculada', () => {
    expect(direitoDeCalar(null)).toBeNull()
  })
})

describe('C19 (continuação) · tarefa 1: travar o registro da previsão antes do resultado existir', () => {
  it('sela a previsão com hash a partir dos dados do registro', async () => {
    const quando = new Date('2026-11-15T05:00:00Z')
    const previsao = await registrarPrevisao('processo-123', 72, quando)
    expect(previsao.caso).toBe('processo-123')
    expect(previsao.p).toBe(72)
    expect(previsao.criadoEm).toBe(quando.toISOString())
    expect(previsao.hashSelo).toMatch(/^[0-9a-f]{64}$/)
    expect(await seloIntacto(previsao)).toBe(true)
  })

  it('detecta quando a chance foi mexida depois do registro', async () => {
    const previsao = await registrarPrevisao('processo-123', 72, new Date('2026-11-15T05:00:00Z'))
    const adulterada = { ...previsao, p: 95 }
    expect(await seloIntacto(adulterada)).toBe(false)
  })

  it('detecta quando a data foi mexida depois do registro', async () => {
    const previsao = await registrarPrevisao('processo-123', 72, new Date('2026-11-15T05:00:00Z'))
    const adulterada = { ...previsao, criadoEm: new Date('2026-11-16T05:00:00Z').toISOString() }
    expect(await seloIntacto(adulterada)).toBe(false)
  })

  it('confere o desfecho em cima de uma previsão selada intacta', async () => {
    const previsao = await registrarPrevisao('processo-123', 72, new Date('2026-11-15T05:00:00Z'))
    const conferida = await conferirPrevisao(previsao, 1, new Date('2026-12-01T00:00:00Z'))
    expect(conferida.y).toBe(1)
    expect(conferida.hashConferencia).toMatch(/^[0-9a-f]{64}$/)
    // a conferência amarra em cima do selo original: previsões com mesmo y mas selo diferente dão hash diferente
    const outraPrevisao = await registrarPrevisao('processo-456', 72, new Date('2026-11-15T05:00:00Z'))
    const outraConferida = await conferirPrevisao(outraPrevisao, 1, new Date('2026-12-01T00:00:00Z'))
    expect(outraConferida.hashConferencia).not.toBe(conferida.hashConferencia)
  })

  it('recusa conferir uma previsão cujo selo foi mexido', async () => {
    const previsao = await registrarPrevisao('processo-123', 72, new Date('2026-11-15T05:00:00Z'))
    const adulterada = { ...previsao, p: 95 }
    await expect(conferirPrevisao(adulterada, 1, new Date('2026-12-01T00:00:00Z'))).rejects.toThrow(/selo/)
  })
})
