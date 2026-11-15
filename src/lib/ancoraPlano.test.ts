// @vitest-environment jsdom
// Âncora pública do trilho do plano (C13/T2): carimba o topo da corrente no OpenTimestamps.
// Aqui a rede é simulada; o teste prova que o selo, o digest e o arquivo .ots saem certos.
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import {
  textoDoSeloPlano, carimbarPlano, montarOtsPlano, ultimaAncoraPlano, CALENDARIOS,
} from './ancoraPlano'

const TOPO = 'cd9c6b6f4a18c5bffc65bd60960bad613cadf69fb522db9ee3f7b18ec20f5d8d'

async function sha256hex(s: string): Promise<string> {
  const b = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))
  return Array.from(b).map(x => x.toString(16).padStart(2, '0')).join('')
}

describe('âncora pública do trilho do plano', () => {
  beforeEach(() => {
    try { localStorage.clear() } catch { /* sem armazenamento */ }
  })
  afterEach(() => vi.restoreAllMocks())

  it('o selo traz o número de registros e o código do topo', () => {
    const selo = textoDoSeloPlano(71, TOPO)
    expect(selo).toContain('registros: 71')
    expect(selo).toContain(`topo: ${TOPO}`)
  })

  it('carimba: envia ao calendário o SHA-256 do selo e guarda a prova', async () => {
    const prova = new Uint8Array([1, 2, 3, 4, 5])
    let enviado: Uint8Array | null = null
    vi.stubGlobal('fetch', vi.fn(async (_url: string, init: RequestInit) => {
      enviado = new Uint8Array(init.body as ArrayBuffer)
      return { ok: true, arrayBuffer: async () => prova.buffer } as unknown as Response
    }))

    const a = await carimbarPlano(71, TOPO)
    const digestEsperado = await sha256hex(textoDoSeloPlano(71, TOPO))

    expect(a.digest).toBe(digestEsperado)
    expect(a.registros).toBe(71)
    expect(a.topo).toBe(TOPO)
    expect(CALENDARIOS).toContain(a.calendario)
    // O corpo enviado ao calendário é exatamente o digest em bytes.
    expect(enviado && Array.from(enviado)).toEqual(digestEsperado.match(/../g)!.map(h => parseInt(h, 16)))
    // Ficou guardado para a próxima visita.
    expect(ultimaAncoraPlano()?.digest).toBe(digestEsperado)
  })

  it('o arquivo .ots começa com o cabeçalho do OpenTimestamps e termina com a prova', async () => {
    const prova = new Uint8Array([9, 9, 9])
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, arrayBuffer: async () => prova.buffer } as unknown as Response)))
    const a = await carimbarPlano(10, TOPO)
    const ots = montarOtsPlano(a)
    // Magic bytes do OpenTimestamps.
    expect(ots[0]).toBe(0x00)
    expect(Array.from(ots.slice(1, 10))).toEqual([0x4f, 0x70, 0x65, 0x6e, 0x54, 0x69, 0x6d, 0x65, 0x73])
    // Termina com os bytes da prova do calendário.
    expect(Array.from(ots.slice(-3))).toEqual([9, 9, 9])
  })

  it('se nenhum calendário responde e não há servidor, dá erro claro', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 503 } as unknown as Response)))
    await expect(carimbarPlano(71, TOPO)).rejects.toThrow(/calendários públicos/)
  })

  it('recusa um topo com formato inesperado', async () => {
    await expect(carimbarPlano(71, 'nao-e-um-hash')).rejects.toThrow(/formato inesperado/)
  })
})
