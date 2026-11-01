// Passo 538: Edge Function monitor-legislacao — extrai URNs LEX do LexML, filtra por tipo e ano, ordena e diagnostica.
import { describe, it, expect, beforeEach } from 'vitest'
import { fingirDeno, fingirFetch } from '../_testes/deno'

const caixa = fingirDeno()
await import('./index')
const chamar = () => caixa.handler!(new Request('https://x.functions.supabase.co/monitor-legislacao', { method: 'POST', body: '{}' }))
const ano = new Date().getFullYear()

let porTermo: (termo: string) => Response
const pedidos: string[] = []
beforeEach(() => { pedidos.length = 0; fingirFetch(u => { pedidos.push(decodeURIComponent(u)); return porTermo(decodeURIComponent(u)) }) })

describe('monitor-legislacao', () => {
  it('consulta um termo de cada vez no SRU do LexML e extrai as URNs: tipo conhecido, ano recente, sem repetição, ordem da mais nova', async () => {
    porTermo = u => {
      if (u.includes('"locação"')) return new Response(`<x>urn:lex:br:federal:lei:${ano}-03-10;14.900 urn:lex:br:federal:lei:${ano}-03-10;14.900 urn:lex:br:federal:decreto:${ano - 1}-12-01;11.000 urn:lex:br:federal:portaria:${ano}-01-01;1 urn:lex:br:federal:lei:${ano - 5}-01-01;9</x>`)
      if (u.includes('"inquilinato"')) return new Response(`urn:lex:br:federal:medida.provisoria:${ano}-06-30;1.300`)
      return new Response('<x/>')
    }
    const b = await (await chamar()).json()
    expect(pedidos).toHaveLength(6)
    expect(pedidos[0]).toContain('urn any "federal" and title any "locação"')
    expect(b.itens.map((i: { urn: string }) => i.urn)).toEqual([
      `urn:lex:br:federal:medida.provisoria:${ano}-06-30;1.300`,
      `urn:lex:br:federal:lei:${ano}-03-10;14.900`,
      `urn:lex:br:federal:decreto:${ano - 1}-12-01;11.000`,
    ])
    expect(b.itens[1]).toEqual({ urn: `urn:lex:br:federal:lei:${ano}-03-10;14.900`, titulo: `Lei nº 14.900/${ano}`, data: `${ano}-03-10`, link: `https://www.lexml.gov.br/urn/urn:lex:br:federal:lei:${ano}-03-10;14.900` })
    expect(b.itens[0].titulo).toBe(`Medida Provisória nº 1.300/${ano}`)
    expect(b.situacao).toContain(`3 norma(s) desde ${ano - 1}`)
    expect(b.situacao).toContain('locação: HTTP 200, 5 URN')
  })

  it('fonte fora do ar não derruba a função: entra no diagnóstico e a lista vem vazia', async () => {
    porTermo = () => { throw new Error('ECONNRESET') }
    const r = await chamar()
    expect(r.status).toBe(200)
    const b = await r.json()
    expect(b.itens).toEqual([])
    expect(b.situacao).toContain('locação: falha (Error: ECONNRESET')
  })
})
