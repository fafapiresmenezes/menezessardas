// Passo 419: selo blockchain — texto do selo e montagem do arquivo .ots (cabeçalho OpenTimestamps).
import { describe, it, expect } from 'vitest'
import { textoDoSelo, textoDoSeloAncorado, montarOts, CALENDARIOS, CABECALHO_SELO_ANTIGO, type Ancoragem } from './ancoragem'

describe('textoDoSelo', () => {
  it('é texto simples com nome do escritório, quantidade de registros e o selo', () => {
    const t = textoDoSelo(42, 'abc123')
    expect(t).toContain('THEYE Institute')
    expect(t).toContain('registros: 42')
    expect(t.endsWith('selo: abc123\n')).toBe(true)
  })
  it('um selo ancorado antes do rebranding baixa com o cabeçalho antigo, para o SHA-256 continuar batendo', async () => {
    const digestDe = async (txt: string) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(txt)))).map(b => b.toString(16).padStart(2, '0')).join('')
    const antigo = textoDoSelo(7, 'selo7', CABECALHO_SELO_ANTIGO)
    expect(await textoDoSeloAncorado({ seq: 7, selo: 'selo7', digest: await digestDe(antigo) })).toBe(antigo)
    const novo = textoDoSelo(8, 'selo8')
    expect(await textoDoSeloAncorado({ seq: 8, selo: 'selo8', digest: await digestDe(novo) })).toBe(novo)
  })
})

describe('montarOts', () => {
  const digest = '7c02ca587ed82fbcbe16b9790f457429d38be62938f91d23d7093dcf2910c6d3'
  const a: Ancoragem = { id: '1', seq: 1, selo: 'x', digest, calendario: CALENDARIOS[0], provaB64: btoa('ð\u0010ABC'), em: '2026-11-02T00:00:00Z' }
  it('começa pelo cabeçalho mágico do OpenTimestamps, versão 1 e operação SHA-256 (0x08)', () => {
    const ots = montarOts(a)
    const magic = Array.from(ots.slice(0, 31)).map(b => b.toString(16).padStart(2, '0')).join('')
    expect(magic).toBe('004f70656e54696d657374616d7073000050726f6f6600bf89e2e884e89294')
    expect(ots[31]).toBe(0x01)
    expect(ots[32]).toBe(0x08)
  })
  it('em seguida vêm os 32 bytes do digest e depois a prova do calendário', () => {
    const ots = montarOts(a)
    const hex = Array.from(ots.slice(33, 65)).map(b => b.toString(16).padStart(2, '0')).join('')
    expect(hex).toBe(digest)
    expect(Array.from(ots.slice(65))).toEqual([0xf0, 0x10, 65, 66, 67])
    expect(ots.length).toBe(31 + 2 + 32 + 5)
  })
  it('os calendários públicos são três endereços https', () => {
    expect(CALENDARIOS).toHaveLength(3)
    for (const c of CALENDARIOS) expect(c).toMatch(/^https:\/\//)
  })
})
