// Passo 529: selo OpenTimestamps da exportação — calendários em sequência, reserva pelo servidor e montagem do .ots.
import { describe, it, expect, vi, beforeEach } from 'vitest'

let configurado = false
const invoke = vi.fn(async (_f: string, _o?: object): Promise<{ data?: Record<string, unknown> | null; error: null }> => ({ data: null, error: null }))
vi.mock('@/lib/supabase', () => ({ get supabaseConfigurado() { return configurado }, supabase: { functions: { invoke: (f: string, o?: object) => invoke(f, o) } } }))
vi.mock('@/lib/trilha', () => ({ listarTrilha: async () => [], verificarTrilha: async () => ({ integra: true, total: 0, selo: '0'.repeat(64) }), registrarEvento: async () => undefined }))
const { provaOts, selarDigest, exportarTrilhaPeriodo } = await import('./exportarTrilha')

const DIG = 'ab'.repeat(32)
const prova = new Uint8Array([0xf0, 0x10, 9, 9])
const fetchMock = vi.fn(async (_u: string | URL | Request, _i?: RequestInit) => new Response(prova, { status: 200 }))
const ALICE = 'https://alice.btc.calendar.opentimestamps.org', BOB = 'https://bob.btc.calendar.opentimestamps.org', FINNEY = 'https://finney.calendar.eternitywall.com'

describe('selo OpenTimestamps da exportação', () => {
  beforeEach(() => { configurado = false; invoke.mockReset().mockResolvedValue({ data: null, error: null }); fetchMock.mockReset().mockImplementation(async () => new Response(prova, { status: 200 })); globalThis.fetch = fetchMock as unknown as typeof fetch })

  it('envia o digest em bytes ao primeiro calendário que responde e devolve a prova', async () => {
    const r = await provaOts(DIG)
    expect(r?.calendario).toBe(ALICE)
    expect(Array.from(r!.prova)).toEqual(Array.from(prova))
    const [url, init] = fetchMock.mock.calls[0]!
    expect(url).toBe(`${ALICE}/digest`)
    expect(init?.method).toBe('POST')
    expect(Array.from(init?.body as Uint8Array)).toEqual(Array.from(Uint8Array.from(DIG.match(/../g)!.map(h => parseInt(h, 16)))))
    expect((init?.headers as Record<string, string>).Accept).toBe('application/vnd.opentimestamps.v1')
  })

  it('pula calendários com erro ou fora do ar; sem nenhum e sem servidor devolve null', async () => {
    fetchMock.mockImplementationOnce(async () => new Response('', { status: 500 })).mockImplementationOnce(async () => { throw new Error('rede') })
    expect((await provaOts(DIG))?.calendario).toBe(FINNEY)
    expect(fetchMock).toHaveBeenCalledTimes(3)
    fetchMock.mockReset().mockImplementation(async () => { throw new Error('bloqueado') })
    expect(await provaOts(DIG)).toBeNull()
    expect(invoke).not.toHaveBeenCalled()
    expect(fetchMock.mock.calls.map(c => c[0])).toEqual([`${ALICE}/digest`, `${BOB}/digest`, `${FINNEY}/digest`])
  })

  it('com Supabase a reserva é a função ancorar-hash (prova em base64); resposta incompleta devolve null', async () => {
    configurado = true
    fetchMock.mockImplementation(async () => { throw new Error('bloqueado') })
    invoke.mockResolvedValueOnce({ data: { prova_b64: btoa(String.fromCharCode(...prova)), calendario: BOB }, error: null })
    const r = await provaOts(DIG)
    expect(invoke).toHaveBeenCalledWith('ancorar-hash', { body: { digest: DIG } })
    expect(r?.calendario).toBe(BOB)
    expect(Array.from(r!.prova)).toEqual(Array.from(prova))
    invoke.mockResolvedValueOnce({ data: { calendario: BOB }, error: null })
    expect(await provaOts(DIG)).toBeNull()
  })

  it('selarDigest monta o .ots (cabeçalho, versão 1, SHA-256, digest, prova) ou null; a exportação sem selo informa', async () => {
    const s = await selarDigest(DIG)
    expect(s?.calendario).toBe(ALICE)
    const ots = s!.ots
    expect(ots.length).toBe(31 + 2 + 32 + prova.length)
    expect(Array.from(ots.slice(0, 5))).toEqual([0x00, 0x4f, 0x70, 0x65, 0x6e])
    expect(ots[31]).toBe(0x01); expect(ots[32]).toBe(0x08)
    expect(Array.from(ots.slice(33, 65))).toEqual(Array.from(Uint8Array.from(DIG.match(/../g)!.map(h => parseInt(h, 16)))))
    expect(Array.from(ots.slice(65))).toEqual(Array.from(prova))
    fetchMock.mockImplementation(async () => { throw new Error('x') })
    expect(await selarDigest(DIG)).toBeNull()
    const e = await exportarTrilhaPeriodo('2026-11-01', '2026-11-02')
    expect(e.ots).toBeNull(); expect(e.calendario).toBeNull(); expect(e.total).toBe(0)
    expect(e.sha256).toMatch(/^[0-9a-f]{64}$/)
    expect(e.nomeBase).toBe('trilha-2026-11-01-a-2026-11-02')
  })
})
