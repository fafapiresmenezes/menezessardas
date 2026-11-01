// Passo 553: Edge Function mercado — previsão de demanda por área com o DataJud (tendência linear, anos incompletos fora) e o Justiça em Números como segunda fonte; cache de 7 dias.
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { fingirDeno, fingirFetch, jsonResp } from '../_testes/deno'
import { zerar, estado } from '../_testes/supabase-js'

const caixa = fingirDeno({ SUPABASE_URL: 'https://db.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'k' })
await import('./index')
const chamar = (corpo: unknown = {}) => caixa.handler!(new Request('https://x.functions.supabase.co/mercado', { method: 'POST', body: JSON.stringify(corpo), headers: { 'Content-Type': 'application/json' } }))
const ULTIMO = new Date().getUTCFullYear() - 1
const buckets = (ns: number[]) => ns.map((n, i) => ({ key_as_string: String(2019 + i), doc_count: n }))

let datajud: (corpo: Record<string, any>) => Response
const pedidos: Record<string, any>[] = []
beforeEach(() => {
  pedidos.length = 0
  vi.spyOn(console, 'error').mockImplementation(() => {})
  // 2019–2024 crescem 100 por ano; o último ano (incompleto no CNJ) vem com 300.
  datajud = () => jsonResp({ aggregations: { ano: { buckets: buckets([1000, 1100, 1200, 1300, 1400, 1500, 300].slice(0, ULTIMO - 2019 + 1)) } } })
  fingirFetch((u, init) => { const c = JSON.parse(String(init?.body)); pedidos.push(c); return u.includes('datajud') ? datajud(c) : new Response('', { status: 500 }) })
  zerar({ jurimetria_cache: [] })
})

describe('mercado', () => {
  it('área desconhecida é 400; OPTIONS passa', async () => {
    expect((await chamar({ area: 'espacial' })).status).toBe(400)
    expect((await caixa.handler!(new Request('https://x/mercado', { method: 'OPTIONS' }))).status).toBe(200)
  })

  it('imobiliário: consulta o TJRJ com as três classes, descarta o ano incompleto, projeta 3 anos com margem e junta a segunda fonte (Justiça em Números); grava no cache', async () => {
    const b = await (await chamar({ area: 'imobiliario' })).json()
    expect(pedidos[0]).toMatchObject({ size: 0, aggs: { ano: { date_histogram: { calendar_interval: 'year' } } } })
    expect(pedidos[0].query.bool.should).toHaveLength(3)
    expect(pedidos[0].query.bool.filter[0].range.dataAjuizamento.lte).toBe(`${ULTIMO}-12-31`)
    expect(b.nome).toContain('TJRJ')
    expect(b.anosIncompletos).toEqual([ULTIMO])
    expect(b.porAno).toHaveLength(ULTIMO - 2019)
    expect(b.amostra).toBe(b.porAno.reduce((s: number, p: { n: number }) => s + p.n, 0))
    // Série exatamente linear: R² 1, margem 0, +100 por ano.
    const ultimoUsado = b.porAno[b.porAno.length - 1]
    expect(b.previsao).toMatchObject({ ano: ULTIMO + 3, processos: ultimoUsado.n + 100 * (ULTIMO + 3 - ultimoUsado.ano), margem: 0, r2: 1 })
    expect(b.previsao.variacao).toBe(Math.round((b.previsao.processos - ultimoUsado.n) / ultimoUsado.n * 100))
    expect(b.confianca).toBe('alta')
    expect(b.jen).toMatchObject({ tribunal: 'TJRJ', indicador: 'casos novos de conhecimento não criminais, 1º grau' })
    expect(b.jen.porAno[0]).toEqual({ ano: 2019, n: 483473 })
    expect(b.jen.previsao.ano).toBe(ULTIMO + 3)
    expect(['alta', 'media', 'baixa']).toContain(b.confiancaCombinada)
    expect(b.doCache).toBeUndefined()
    expect(estado.upserts[0]).toMatchObject({ tabela: 'jurimetria_cache', linha: { chave: 'mercado4|imobiliario' } })
  })

  it('cache recente devolve sem consultar o CNJ; cache velho é ignorado', async () => {
    const resultado = { area: 'civel', previsao: { ano: 2028, processos: 1 } }
    estado.tabelas.jurimetria_cache = [{ chave: 'mercado4|civel', resultado, criado_em: new Date(Date.now() - 2 * 86400000).toISOString() }]
    expect(await (await chamar({ area: 'civel' })).json()).toEqual({ ...resultado, doCache: true })
    expect(pedidos).toHaveLength(0)
    estado.tabelas.jurimetria_cache[0]!.criado_em = new Date(Date.now() - 9 * 86400000).toISOString()
    const b = await (await chamar({ area: 'civel' })).json()
    expect(b.doCache).toBeUndefined()
    expect(pedidos).toHaveLength(1)
  })

  it('CNJ fora do ar: devolve o cache antigo marcado como desatualizado, ou 502 sem cache', async () => {
    datajud = () => new Response('erro', { status: 503 })
    let r = await chamar({ area: 'penal' })
    expect(r.status).toBe(502)
    expect((await r.json()).erro).toContain('não respondeu')
    estado.tabelas.jurimetria_cache = [{ chave: 'mercado4|penal', resultado: { area: 'penal', previsao: { processos: 5 } }, criado_em: '2020-01-01T00:00:00Z' }]
    r = await chamar({ area: 'penal' })
    expect(r.status).toBe(200)
    expect(await r.json()).toMatchObject({ area: 'penal', doCache: true, desatualizado: true })
  })

  it('poucos anos: confiança insuficiente e nada vai para o cache; trabalhista sem registros no DataJud usa o Justiça em Números como previsão principal', async () => {
    datajud = () => jsonResp({ aggregations: { ano: { buckets: buckets([10, 20]) } } })
    let b = await (await chamar({ area: 'familia' })).json()
    expect(b.confianca).toBe('insuficiente')
    expect(b.previsao).toBeDefined() // vem do Justiça em Números
    expect(b.fontePrevisao).toContain('Justiça em Números')
    datajud = () => jsonResp({ aggregations: { ano: { buckets: [] } } })
    b = await (await chamar({ area: 'trabalhista' })).json()
    expect(pedidos[1].query.bool.should.some((s: any) => s.term?.['classe.codigo'] === 985)).toBe(true)
    expect(b).toMatchObject({ amostra: 0, confianca: 'insuficiente', fontePrevisao: expect.stringContaining('TRT1') })
    expect(b.jen.tribunal).toBe('TRT1')
    expect(b.previsao).toEqual(b.jen.previsao)
    expect(estado.upserts).toHaveLength(2)
    datajud = () => jsonResp({ aggregations: { ano: { buckets: [] } } })
    estado.rpcResposta = {}
  })
})
