// Passo 525: ancoragem OpenTimestamps — envio do digest aos calendários (com tolerância a falhas), guarda local e no banco, lastro e download.
import { describe, it, expect, vi, beforeEach } from 'vitest'

let configurado = false
const insert = vi.fn(async (_r: object): Promise<{ error: { message: string } | null }> => ({ error: null }))
let linhas: Record<string, unknown>[] = []
vi.mock('./supabase', () => ({ get supabaseConfigurado() { return configurado }, supabase: { from: () => ({ select: () => ({ order: async () => ({ data: linhas }) }), insert: (r: object) => insert(r) }) } }))
let eventos: { seq: number; hash: string }[] = []
let verificacao = { total: 0, integra: true, quebraEm: null as number | null, selo: '' }
const registrarEvento = vi.fn(async (_e: object) => undefined)
vi.mock('./trilha', () => ({ listarTrilha: async () => eventos, verificarTrilha: async () => verificacao, registrarEvento: (e: object) => registrarEvento(e) }))
const mem = new Map<string, string>()
;(globalThis as { localStorage?: unknown }).localStorage = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => { mem.set(k, v) }, removeItem: (k: string) => { mem.delete(k) } }
const { ancorarAgora, listarAncoragens, verificarLastro, montarOts, textoDoSelo, CALENDARIOS, selosPendentes, retomarSelosPendentes } = await import('./ancoragem')

const SELO = 'ab'.repeat(32)
const hexDe = (b: ArrayBuffer) => Array.from(new Uint8Array(b)).map(x => x.toString(16).padStart(2, '0')).join('')
const digestEsperado = async (seq: number, selo: string) => hexDe(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(textoDoSelo(seq, selo))))
const prova = new Uint8Array([0xf0, 0x10, 1, 2, 3])
const ok = () => new Response(prova, { status: 200 })
const fetchMock = vi.fn(async (_u: string | URL | Request, _i?: RequestInit) => ok())

describe('ancorarAgora', () => {
  beforeEach(() => {
    configurado = false; mem.clear(); insert.mockClear(); linhas = []; registrarEvento.mockClear()
    eventos = [{ seq: 1, hash: 'h1' }, { seq: 2, hash: 'h2' }, { seq: 3, hash: SELO }]
    verificacao = { total: 3, integra: true, quebraEm: null, selo: SELO }
    fetchMock.mockReset().mockImplementation(async () => ok())
    globalThis.fetch = fetchMock as unknown as typeof fetch
  })

  it('recusa trilha vazia ou comprometida sem falar com a rede', async () => {
    verificacao = { total: 0, integra: true, quebraEm: null, selo: '' }
    await expect(ancorarAgora()).rejects.toThrow('Ainda não há registros na trilha para ancorar.')
    verificacao = { total: 3, integra: false, quebraEm: 2, selo: SELO }
    await expect(ancorarAgora()).rejects.toThrow('comprometida a partir do registro nº 2')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('envia o SHA-256 do arquivo do selo ao primeiro calendário, guarda no navegador, registra na trilha e o .ots fica coerente', async () => {
    const a = await ancorarAgora()
    const d = await digestEsperado(3, SELO)
    expect(a).toMatchObject({ seq: 3, selo: SELO, digest: d, calendario: CALENDARIOS[0], id: `3-${d.slice(0, 8)}` })
    expect(a.provaB64).toBe(btoa(String.fromCharCode(...prova)))
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]!
    expect(url).toBe(`${CALENDARIOS[0]}/digest`)
    expect(init?.method).toBe('POST')
    expect(hexDe((init?.body as Uint8Array).buffer as ArrayBuffer)).toBe(d)
    expect(registrarEvento).toHaveBeenCalledWith({ tipo: 'trilha_ancorada', entidade: a.id, resumo: 'Selo do registro nº 3 enviado ao OpenTimestamps' })
    expect(await listarAncoragens()).toEqual([a])
    const ots = montarOts(a)
    expect(ots.length).toBe(31 + 2 + 32 + prova.length)
    expect(Array.from(ots.slice(-prova.length))).toEqual(Array.from(prova))
    expect(insert).not.toHaveBeenCalled()
  })

  it('passa ao calendário seguinte quando um responde erro ou cai; se todos falham, erro claro com o último motivo', async () => {
    fetchMock.mockImplementationOnce(async () => new Response('x', { status: 503 })).mockImplementationOnce(async () => { throw new Error('rede caiu') }).mockImplementationOnce(async () => ok())
    const a = await ancorarAgora()
    expect(a.calendario).toBe(CALENDARIOS[2])
    expect(fetchMock).toHaveBeenCalledTimes(3)
    fetchMock.mockReset().mockImplementation(async () => new Response('', { status: 500 }))
    await expect(ancorarAgora()).rejects.toThrow(`Não foi possível falar com os calendários públicos agora (${CALENDARIOS[2]} respondeu 500). Tente de novo mais tarde.`)
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

  it('com Supabase grava na tabela ancoragens (erro do banco tenta o próximo calendário) e lista convertendo as colunas', async () => {
    configurado = true
    const a = await ancorarAgora()
    expect(insert).toHaveBeenCalledWith({ seq: 3, selo: SELO, digest: a.digest, calendario: CALENDARIOS[0], prova_b64: a.provaB64 })
    expect(mem.size).toBe(0)
    insert.mockResolvedValueOnce({ error: { message: 'RLS' } })
    const b = await ancorarAgora()
    expect(b.calendario).toBe(CALENDARIOS[1])
    linhas = [{ id: 7, seq: '3', selo: SELO, digest: a.digest, calendario: CALENDARIOS[0], prova_b64: a.provaB64, criado_em: '2026-11-02T10:00:00Z' }]
    expect(await listarAncoragens()).toEqual([{ id: '7', seq: 3, selo: SELO, digest: a.digest, calendario: CALENDARIOS[0], provaB64: a.provaB64, em: '2026-11-02T10:00:00Z' }])
  })

  it('verificarLastro aponta registro apagado, alterado, digest errado e coerente', async () => {
    const d3 = await digestEsperado(3, SELO)
    mem.set('lsm-ancoragens-v1', JSON.stringify([
      { id: 'a', seq: 9, selo: 'x', digest: 'd', calendario: 'c', provaB64: '', em: '' },
      { id: 'b', seq: 2, selo: 'outro', digest: 'd', calendario: 'c', provaB64: '', em: '' },
      { id: 'c', seq: 3, selo: SELO, digest: 'errado', calendario: 'c', provaB64: '', em: '' },
      { id: 'd', seq: 3, selo: SELO, digest: d3, calendario: 'c', provaB64: '', em: '' },
    ]))
    expect(await verificarLastro()).toEqual([
      { ancoragemId: 'a', seq: 9, coerente: false, motivo: 'O registro ancorado não existe mais na trilha.' },
      { ancoragemId: 'b', seq: 2, coerente: false, motivo: 'O registro foi alterado depois de ancorado.' },
      { ancoragemId: 'c', seq: 3, coerente: false, motivo: 'O digest guardado não confere com o selo.' },
      { ancoragemId: 'd', seq: 3, coerente: true },
    ])
  })

  it('D11: quando todos os calendários falham, o selo fica pendente no navegador e é reenviado por retomarSelosPendentes', async () => {
    fetchMock.mockReset().mockImplementation(async () => new Response('', { status: 500 }))
    await expect(ancorarAgora()).rejects.toThrow('O selo ficou pendente')
    const d = await digestEsperado(3, SELO)
    expect(selosPendentes()).toMatchObject([{ seq: 3, selo: SELO, digest: d, tentativas: 1 }])
    expect(await retomarSelosPendentes()).toEqual({ enviados: 0, pendentes: 1 })
    expect(selosPendentes()[0].tentativas).toBe(2)
    fetchMock.mockReset().mockImplementation(async () => ok())
    expect(await retomarSelosPendentes()).toEqual({ enviados: 1, pendentes: 0 })
    expect((await listarAncoragens()).map(a => a.digest)).toEqual([d])
    expect(registrarEvento).toHaveBeenCalledTimes(1)
  })
})
