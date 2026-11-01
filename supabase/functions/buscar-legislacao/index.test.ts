// Passo 535: Edge Function buscar-legislacao — catálogo do Planalto, LexML, Câmara, relevância e ordenação.
import { describe, it, expect, beforeEach } from 'vitest'
import { fingirDeno, fingirFetch, jsonResp } from '../_testes/deno'

const caixa = fingirDeno()
await import('./index')
const buscar = (q: string) => caixa.handler!(new Request(`https://x.functions.supabase.co/buscar-legislacao?q=${encodeURIComponent(q)}`))

let lexml: () => Response
let camara: () => Response
beforeEach(() => {
  lexml = () => new Response('', { status: 500 })
  camara = () => new Response('', { status: 500 })
  fingirFetch(u => (u.includes('lexml') ? lexml() : camara()))
})

describe('buscar-legislacao', () => {
  it('termo curto é recusado', async () => {
    const r = await buscar('a')
    expect(r.status).toBe(400)
  })

  it('com as fontes externas fora do ar responde só com o catálogo do Planalto, relevância alta para locação', async () => {
    const b = await (await buscar('locação')).json()
    expect(b.fontes).toEqual(['Planalto', 'LexML', 'Câmara'])
    expect(b.leis.map((l: { numero: string }) => l.numero)).toContain('8245/1991')
    const lei = b.leis.find((l: { numero: string }) => l.numero === '8245/1991')
    expect(lei).toMatchObject({ titulo: 'Lei de Locações Urbanas', relevancia: 'alta', fonte: 'Planalto' })
    expect(lei.url).toMatch(/planalto\.gov\.br/)
  })

  it('junta LexML (sem repetir número) e Câmara, ordena por relevância e limita a 10', async () => {
    lexml = () => new Response('<li>Lei nº 8.245/1991</li><li>Lei nº 8.245/1991</li><li>Lei nº 12.112/2009</li>', { status: 200 })
    camara = () => jsonResp({ dados: [{ id: 77, numero: 3925, ano: 2026, ementa: 'Altera a Lei do Inquilinato sobre locação' }] })
    const b = await (await buscar('locação')).json()
    const numeros = b.leis.map((l: { numero: string }) => l.numero)
    expect(new Set(numeros).size).toBe(numeros.length)
    expect(numeros).toContain('12112/2009')
    expect(numeros).toContain('PL 3925/2026')
    const pl = b.leis.find((l: { numero: string }) => l.numero === 'PL 3925/2026')
    expect(pl).toMatchObject({ fonte: 'Câmara', relevancia: 'alta', url: expect.stringContaining('idProposicao=77') })
    const ordem = { alta: 0, media: 1, baixa: 2 } as Record<string, number>
    const rel = b.leis.map((l: { relevancia: string }) => ordem[l.relevancia])
    expect(rel).toEqual([...rel].sort((a, c) => a - c))
    expect(b.leis.length).toBeLessThanOrEqual(10)
    expect(b.total).toBeGreaterThanOrEqual(b.leis.length)
  })
})
