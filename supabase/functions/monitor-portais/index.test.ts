// Passo 546: Edge Function monitor-portais — radar diário: Câmara e Google Notícias por área, sem repetir, gravado com a área.
import { describe, it, expect, beforeEach } from 'vitest'
import { fingirDeno, fingirFetch, jsonResp } from '../_testes/deno'
import { zerar, estado } from '../_testes/supabase-js'

const caixa = fingirDeno({ SUPABASE_URL: 'https://db', SUPABASE_SERVICE_ROLE_KEY: 'k' })
await import('./index')
const chamar = (body: unknown = {}) => caixa.handler!(new Request('https://x.functions.supabase.co/monitor-portais', { method: 'POST', body: JSON.stringify(body) }))

const pedidos: string[] = []
let camara: (termo: string) => Response
let noticias: (termo: string) => Response
beforeEach(() => {
  pedidos.length = 0
  camara = () => jsonResp({ dados: [] })
  noticias = () => new Response('<rss></rss>')
  fingirFetch(u => { pedidos.push(u); const q = new URL(u).searchParams; return u.includes('camara.leg.br') ? camara(q.get('keywords')!) : noticias(q.get('q')!) })
  zerar({ novidades_portais: [] })
})

describe('monitor-portais', () => {
  it('com área informada consulta só os termos dela; sem novidade nada é gravado', async () => {
    const b = await (await chamar({ area: 'trabalhista' })).json()
    expect(pedidos.filter(p => p.includes('camara')).map(p => decodeURIComponent(new URL(p).searchParams.get('keywords')!))).toEqual(['CLT', 'direito do trabalho'])
    expect(pedidos.filter(p => p.includes('news.google')).length).toBe(2)
    expect(b).toEqual({ encontrados: 0, gravados: 0, situacao: expect.stringContaining('Câmara "CLT": 0') })
    expect(estado.upserts).toHaveLength(0)
  })

  it('mapeia projetos da Câmara e notícias do RSS, limpa CDATA e HTML, tira duplicadas e grava com a área e visto_em', async () => {
    camara = t => (t === 'inquilinato' ? jsonResp({ dados: [{ id: 77, siglaTipo: 'PL', numero: 3925, ano: 2026, ementa: 'Altera a Lei 8.245' }, { id: 77, siglaTipo: 'PL', numero: 3925, ano: 2026, ementa: 'repetido' }] }) : jsonResp({ dados: [] }))
    noticias = t => (t === 'STJ condomínio'
      ? new Response('<rss><item><title><![CDATA[STJ decide <b>taxa</b> de condomínio]]></title><link>https://g.news/1</link><pubDate>Mon, 02 Nov 2026 10:00:00 GMT</pubDate><source url="x">Conjur</source></item><item><title>Sem link</title></item></rss>')
      : new Response('<rss></rss>'))
    const b = await (await chamar({ area: 'imobiliario' })).json()
    expect(b.encontrados).toBe(2)
    expect(b.gravados).toBe(2)
    expect(b.situacao).toContain('Câmara "inquilinato": 2')
    expect(b.situacao).toContain('Notícias "STJ condomínio": 1')
    const linhas = estado.upserts.map(u => u.linha as Record<string, unknown>)
    // id repetido: fica a última leitura
    expect(linhas[0]).toMatchObject({ id: 'camara-77', fonte: 'Câmara dos Deputados', tipo: 'Projeto', titulo: 'PL 3925/2026', resumo: 'repetido', link: 'https://www.camara.leg.br/propostas-legislativas/77', termo: 'inquilinato', area: 'imobiliario' })
    expect(linhas[1]).toMatchObject({ fonte: 'Conjur', tipo: 'Notícia', titulo: 'STJ decide taxa de condomínio', link: 'https://g.news/1', data: '2026-11-02', termo: 'STJ condomínio', area: 'imobiliario' })
    expect(String(linhas[1]!.id)).toMatch(/^noticia-/)
    expect(String(linhas[0]!.visto_em)).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })

  it('fonte que falha entra no diagnóstico sem derrubar as outras; sem área percorre as 10 áreas', async () => {
    camara = () => { throw new Error('timeout') }
    const b = await (await chamar({ area: 'penal' })).json()
    expect(b.situacao).toContain('Câmara "código penal": falha Error: timeout')
    expect(b.situacao).toContain('Notícias "STF penal decisão": 0')
    pedidos.length = 0
    await chamar({})
    const termosCamara = new Set(pedidos.filter(p => p.includes('camara')).map(p => new URL(p).searchParams.get('keywords')))
    expect(termosCamara.size).toBeGreaterThanOrEqual(20)
    expect(pedidos[0]).toContain('dataApresentacaoInicio=')
  })
})
