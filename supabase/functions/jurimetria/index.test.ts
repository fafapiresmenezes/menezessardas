// Passo 540: Edge Function jurimetria — agregações públicas do DataJud, chance de êxito, cache de 24 h e reserva.
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { fingirDeno, fingirFetch, jsonResp } from '../_testes/deno'
import { zerar, estado } from '../_testes/supabase-js'

const caixa = fingirDeno({ SUPABASE_URL: 'https://db', SUPABASE_SERVICE_ROLE_KEY: 'k' })
await import('./index')
const chamar = (body: unknown) => caixa.handler!(new Request('https://x.functions.supabase.co/jurimetria', { method: 'POST', body: JSON.stringify(body) }))
const buckets = (m: Record<number, number>) => ({ hits: { total: { value: Object.values(m).reduce((a, b) => a + b, 0) + 50 } }, aggregations: { resultados: { buckets: Object.entries(m).map(([k, v]) => ({ key: Number(k), doc_count: v })) } } })

let datajud: () => Response
const pedidos: { url: string; body: Record<string, unknown>; auth: string }[] = []
beforeEach(() => {
  pedidos.length = 0
  datajud = () => jsonResp(buckets({ 219: 120, 221: 40, 220: 40, 466: 20, 385: 30 }))
  fingirFetch((u, init) => { pedidos.push({ url: u, body: JSON.parse(String(init?.body)), auth: (init?.headers as Record<string, string>).Authorization }); return datajud() })
  zerar({ jurimetria_cache: [] })
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('jurimetria', () => {
  it('recusa tribunal ou ação fora da lista', async () => {
    expect((await chamar({ tribunal: 'tjxx' })).status).toBe(400)
    expect((await chamar({ acao: 'outra' })).status).toBe(400)
  })

  it('consulta o DataJud com a classe e o órgão, calcula êxito do autor, acordo, sem mérito e confiança, e guarda no cache', async () => {
    const b = await (await chamar({ tribunal: 'tjsp', acao: 'renovatoria', orgao: ' 3ª Vara Cível ' })).json()
    expect(pedidos[0]!.url).toBe('https://api-publica.datajud.cnj.jus.br/api_publica_tjsp/_search')
    expect(pedidos[0]!.auth).toMatch(/^APIKey /)
    expect(pedidos[0]!.body).toMatchObject({ size: 0, track_total_hits: true, query: { bool: { filter: [{ match_phrase: { 'classe.nome': 'Renovatória de Locação' } }, { match_phrase: { 'orgaoJulgador.nome': '3ª Vara Cível' } }] } } })
    expect(b).toMatchObject({ tribunal: 'TJSP', acao: 'Renovatória de Locação', orgao: ' 3ª Vara Cível ', processos: 300, resultados: { procedencia: 120, parcial: 40, improcedencia: 40, semMerito: 20, acordo: 30 } })
    expect(b.chanceExito).toBe(70) // (120 + 40/2) / 200
    expect(b.taxaAcordo).toBe(12) // 30 / 250
    expect(b.taxaSemMerito).toBe(8)
    expect(b.amostra).toBe(200)
    expect(b.confianca).toBe('alta')
    expect(b.fonte).toContain('DataJud')
    expect(estado.upserts[0]).toMatchObject({ tabela: 'jurimetria_cache', linha: { chave: 'tjsp|renovatoria|3ª vara cível' } })
  })

  it('amostra pequena rebaixa a confiança; sem julgados a chance fica nula', async () => {
    datajud = () => jsonResp(buckets({ 219: 20, 220: 15 }))
    let b = await (await chamar({})).json()
    expect(b.confianca).toBe('media')
    expect(b.chanceExito).toBe(57)
    datajud = () => jsonResp(buckets({ 385: 3 }))
    b = await (await chamar({})).json()
    expect(b.chanceExito).toBeNull()
    expect(b.amostra).toBe(0)
    expect(b.confianca).toBe('baixa')
    expect(b.taxaAcordo).toBe(100)
  })

  it('cache recente responde sem ir ao CNJ; cache velho é refeito; CNJ fora do ar devolve o cache como reserva ou 502', async () => {
    estado.tabelas.jurimetria_cache = [{ chave: 'tjrj|despejo|', resultado: { tribunal: 'TJRJ', chanceExito: 61 }, criado_em: new Date(Date.now() - 3600000).toISOString() }]
    let b = await (await chamar({})).json()
    expect(b).toEqual({ tribunal: 'TJRJ', chanceExito: 61, doCache: true })
    expect(pedidos).toHaveLength(0)
    estado.tabelas.jurimetria_cache[0]!.criado_em = new Date(Date.now() - 30 * 3600000).toISOString()
    b = await (await chamar({})).json()
    expect(pedidos).toHaveLength(1)
    expect(b.doCache).toBeUndefined()
    datajud = () => new Response('erro', { status: 503 })
    b = await (await chamar({})).json()
    expect(b).toMatchObject({ tribunal: 'TJRJ', chanceExito: 61, doCache: true, desatualizado: true })
    expect(b.aviso).toContain('CNJ fora do ar')
    estado.tabelas.jurimetria_cache = []
    const r = await chamar({})
    expect(r.status).toBe(502)
  })
})
