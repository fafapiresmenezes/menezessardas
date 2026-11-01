// Passo 536: Edge Function ancorar-hash — validação do digest e tentativa em sequência nos calendários OpenTimestamps.
import { describe, it, expect, beforeEach } from 'vitest'
import { fingirDeno, fingirFetch } from '../_testes/deno'

const caixa = fingirDeno()
await import('./index')
const chamar = (body: unknown, method = 'POST') => caixa.handler!(new Request('https://x.functions.supabase.co/ancorar-hash', { method, body: typeof body === 'string' ? body : JSON.stringify(body) }))
const DIGEST = 'f53fcc17ab74d90690f2a40141aee2472295e4917c146543be69f7c4645f2337'

let porCalendario: Record<string, () => Response>
const pedidos: { url: string; body: Uint8Array }[] = []
beforeEach(() => {
  pedidos.length = 0
  porCalendario = {}
  fingirFetch((u, init) => { pedidos.push({ url: u, body: init?.body as Uint8Array }); const cal = Object.keys(porCalendario).find(k => u.startsWith(k)); return cal ? porCalendario[cal]!() : new Response('', { status: 500 }) })
})

describe('ancorar-hash', () => {
  it('corpo inválido e digest fora do padrão dão 400 sem chamar a rede; maiúsculas são aceitas', async () => {
    expect((await chamar('isto não é json')).status).toBe(400)
    expect((await chamar({ digest: 'abc' })).status).toBe(400)
    expect(pedidos).toHaveLength(0)
    porCalendario['https://alice.btc.calendar.opentimestamps.org'] = () => new Response(new Uint8Array([1, 2, 3]))
    const b = await (await chamar({ digest: DIGEST.toUpperCase() })).json()
    expect(b.digest).toBe(DIGEST)
  })

  it('envia os 32 bytes ao primeiro calendário que responde e devolve a prova em base64', async () => {
    porCalendario['https://alice.btc.calendar.opentimestamps.org'] = () => new Response(new Uint8Array([0, 79, 112]))
    const r = await chamar({ digest: DIGEST })
    expect(r.status).toBe(200)
    const b = await r.json()
    expect(pedidos).toHaveLength(1)
    expect(pedidos[0]!.url).toBe('https://alice.btc.calendar.opentimestamps.org/digest')
    expect(pedidos[0]!.body).toHaveLength(32)
    expect(pedidos[0]!.body[0]).toBe(0xf5)
    expect(b.calendario).toBe('https://alice.btc.calendar.opentimestamps.org')
    expect(b.provaB64).toBe(btoa(String.fromCharCode(0, 79, 112)))
    expect(b.em).toMatch(/^\d{4}-/)
  })

  it('pula calendário com erro ou fora do ar e segue para o próximo; todos falhando dá 502 com a lista', async () => {
    porCalendario['https://alice.btc.calendar.opentimestamps.org'] = () => new Response('', { status: 503 })
    porCalendario['https://bob.btc.calendar.opentimestamps.org'] = () => { throw new Error('timeout') }
    porCalendario['https://finney.calendar.eternitywall.com'] = () => new Response(new Uint8Array([9]))
    const b = await (await chamar({ digest: DIGEST })).json()
    expect(b.calendario).toBe('https://finney.calendar.eternitywall.com')
    expect(pedidos).toHaveLength(3)
    porCalendario['https://finney.calendar.eternitywall.com'] = () => new Response('', { status: 500 })
    const r = await chamar({ digest: DIGEST })
    expect(r.status).toBe(502)
    const e = await r.json()
    expect(e.falhas).toHaveLength(3)
    expect(e.falhas[1]).toContain('timeout')
  })
})
