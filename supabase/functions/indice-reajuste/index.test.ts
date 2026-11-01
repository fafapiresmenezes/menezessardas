// Passo 540: Edge Function indice-reajuste — acumulado de 12 meses do Banco Central, tentativas e reserva em cache.
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { fingirDeno, fingirFetch, jsonResp } from '../_testes/deno'
import { zerar, estado } from '../_testes/supabase-js'

const caixa = fingirDeno({ SUPABASE_URL: 'https://db', SUPABASE_SERVICE_ROLE_KEY: 'k' })
await import('./index')
const chamar = (body: unknown) => caixa.handler!(new Request('https://x.functions.supabase.co/indice-reajuste', { method: 'POST', body: JSON.stringify(body) }))
const serie12 = Array.from({ length: 12 }, (_, i) => ({ data: `01/${String(i + 1).padStart(2, '0')}/2026`, valor: '0.5' }))

let bcb: () => Response
const pedidos: string[] = []
beforeEach(() => {
  pedidos.length = 0
  bcb = () => jsonResp(serie12)
  fingirFetch(u => { pedidos.push(u); return bcb() })
  zerar({ jurimetria_cache: [] })
  vi.useFakeTimers({ shouldAdvanceTime: true })
})

describe('indice-reajuste', () => {
  it('índice sem série pública é recusado', async () => {
    const r = await chamar({ indice: 'incc' })
    expect(r.status).toBe(400)
    expect(pedidos).toHaveLength(0)
  })

  it('IGP-M: lê a série 189 (últimos 12), compõe o acumulado, devolve os meses e guarda no cache', async () => {
    const b = await (await chamar({ indice: 'igpm' })).json()
    expect(pedidos[0]).toBe('https://api.bcb.gov.br/dados/serie/bcdata.sgs.189/dados/ultimos/12?formato=json')
    expect(b.acumulado12m).toBe(6.17) // (1,005^12 − 1) × 100
    expect(b.de).toBe('01/01/2026')
    expect(b.ate).toBe('01/12/2026')
    expect(b.meses).toHaveLength(12)
    expect(b.meses[0]).toEqual({ data: '01/01/2026', valor: 0.5 })
    expect(b.fonte).toContain('série 189')
    expect(estado.upserts[0]).toMatchObject({ tabela: 'jurimetria_cache', linha: { chave: 'bcb|igpm' } })
    const ipca = await (await chamar({ indice: 'ipca' })).json()
    expect(pedidos[1]).toContain('sgs.433')
    expect(ipca.fonte).toContain('série 433')
  })

  it('tenta três vezes; se o Banco Central não responder, usa o cache como reserva ou devolve 502', async () => {
    bcb = () => new Response('', { status: 500 })
    estado.tabelas.jurimetria_cache = [{ chave: 'bcb|inpc', resultado: { indice: 'inpc', acumulado12m: 4.1 }, criado_em: '2026-10-01T00:00:00Z' }]
    const p = chamar({ indice: 'inpc' })
    await vi.advanceTimersByTimeAsync(5000)
    const b = await (await p).json()
    expect(pedidos).toHaveLength(3)
    expect(b).toMatchObject({ indice: 'inpc', acumulado12m: 4.1, desatualizado: true })
    expect(b.aviso).toContain('Banco Central fora do ar')
    estado.tabelas.jurimetria_cache = []
    const p2 = chamar({ indice: 'inpc' })
    await vi.advanceTimersByTimeAsync(5000)
    expect((await p2).status).toBe(502)
  })
})
