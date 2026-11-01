// Passo 556: Edge Function perfil-julgador — estatísticas públicas do órgão (DataJud), manchetes e perfil decisório pela IA com ferramenta; teto, consumo e histórico.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { fingirDeno, fingirFetch, jsonResp } from '../_testes/deno'
import { zerar, estado } from '../_testes/supabase-js'

const caixa = fingirDeno({ SUPABASE_URL: 'https://db.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'k' })
await import('./index')
const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString('base64url')
const JWT = `x.${b64({ role: 'authenticated', sub: 'u1' })}.y`
const chamar = (corpo: unknown = {}, headers: Record<string, string> = { authorization: `Bearer ${JWT}` }) =>
  caixa.handler!(new Request('https://x.functions.supabase.co/perfil-julgador', { method: 'POST', body: JSON.stringify(corpo), headers: { 'Content-Type': 'application/json', ...headers } }))
const PERFIL = { resumo: 'Órgão com alta taxa de procedência em despejos.', tendencias: ['70% de procedência'], temas: ['locação'], comoArgumentar: ['Juntar comprovantes de inadimplência'], cuidados: ['Amostra pequena'], confianca: 'media' }
const RSS = '<rss><channel><item><title>Juíza Ana decide <b>caso</b></title><link>https://n/1</link><source url="x">O Globo</source><pubDate>Mon, 02 Nov 2026 10:00:00 GMT</pubDate></item><item><title></title></item></channel></rss>'

let ia: (corpo: Record<string, any>) => Response
let datajud: () => Response
const pedidos: { url: string; corpo?: Record<string, any> }[] = []
beforeEach(() => {
  pedidos.length = 0
  vi.useFakeTimers({ shouldAdvanceTime: true })
  vi.spyOn(console, 'error').mockImplementation(() => {})
  ia = () => jsonResp({ model: 'claude-sonnet-5-5', usage: { input_tokens: 900, output_tokens: 300 }, content: [{ type: 'tool_use', name: 'registrar_perfil', input: PERFIL }] })
  datajud = () => jsonResp({ hits: { total: { value: 120 } }, aggregations: {
    classes: { buckets: [{ key: 'Despejo', doc_count: 80 }] }, assuntos: { buckets: [{ key: 'Locação', doc_count: 90 }] },
    resultados: { buckets: [{ key: 219, doc_count: 50 }, { key: 220, doc_count: 20 }, { key: 999, doc_count: 1 }] },
    anos: { buckets: [{ key_as_string: '0019', doc_count: 1 }, { key_as_string: '2023', doc_count: 60 }, { key_as_string: '2024', doc_count: 59 }] } } })
  fingirFetch((u, init) => {
    const corpo = init?.body ? JSON.parse(String(init.body)) : undefined
    pedidos.push({ url: u, corpo })
    if (u.includes('anthropic')) return ia(corpo)
    if (u.includes('datajud')) return datajud()
    if (u.includes('news.google')) return new Response(RSS)
    return new Response('', { status: 500 })
  })
  zerar({ configuracoes: [{ chave: 'anthropic_api_key', valor: 'sk' }, { chave: 'cron_segredo', valor: 'segredo' }], consumo_api: [], perfis_julgador: [] })
  estado.rpcResposta.teto_consumo_atingido = false
})
afterEach(() => vi.useRealTimers())

describe('perfil-julgador', () => {
  it('exige pessoa logada (ou sonda com segredo do cron); tribunal não coberto 400; sem nome nem órgão 400; sem chave da IA 503', async () => {
    expect((await chamar({ nome: 'Ana' }, {})).status).toBe(401)
    expect((await chamar({ nome: 'Ana', sonda: true }, { 'x-cron-secret': 'errado' })).status).toBe(401)
    expect((await chamar({ nome: 'Ana', tribunal: 'tjxx' })).status).toBe(400)
    expect((await chamar({ nome: ' ', orgao: '' })).status).toBe(400)
    estado.tabelas.configuracoes = [{ chave: 'cron_segredo', valor: 'segredo' }]
    expect((await chamar({ nome: 'Ana' })).status).toBe(503)
    expect(pedidos).toHaveLength(0)
  })

  it('monta estatísticas do DataJud (resultados traduzidos, anos plausíveis), manchetes limpas, chama a IA com a ferramenta, registra consumo e guarda o perfil', async () => {
    const b = await (await chamar({ nome: 'Ana Souza', orgao: '3ª Vara Cível', tema: 'despejo' })).json()
    expect(b).toMatchObject({ ...PERFIL, tribunal: 'TJRJ', orgao: '3ª Vara Cível', nome: 'Ana Souza' })
    expect(b.estatisticas).toEqual({ processos: 120, classes: [{ nome: 'Despejo', total: 80 }], assuntos: [{ nome: 'Locação', total: 90 }],
      resultados: [{ nome: 'Procedência', total: 50 }, { nome: 'Improcedência', total: 20 }, { nome: '999', total: 1 }], porAno: [{ ano: '2023', total: 60 }, { ano: '2024', total: 59 }] })
    expect(b.noticias).toEqual([{ titulo: 'Juíza Ana decide caso', link: 'https://n/1', fonte: 'O Globo', data: 'Mon, 02 Nov 2026' }])
    const dj = pedidos.find(p => p.url.includes('datajud'))!
    expect(dj.url).toContain('api_publica_tjrj')
    expect(dj.corpo!.query).toEqual({ match_phrase: { 'orgaoJulgador.nome': '3ª Vara Cível' } })
    expect(pedidos.find(p => p.url.includes('news.google'))!.url).toContain(encodeURIComponent('"Ana Souza"'))
    const req = pedidos.find(p => p.url.includes('anthropic'))!.corpo!
    expect(req.model).toBe('claude-sonnet-5-5')
    expect(req.tools[0].name).toBe('registrar_perfil')
    expect(req.messages[0].content).toContain('"tema":"despejo"')
    expect(req.messages[0].content).toContain('"processos":120')
    expect(req.system).toContain('não psicológico')
    expect(estado.inseridos.find(i => i.tabela === 'consumo_api')!.linha).toMatchObject({ funcao: 'perfil-julgador', usuario_id: 'u1', modelo: 'claude-sonnet-5-5', tokens_entrada: 900, tokens_saida: 300 })
    expect(estado.inseridos.find(i => i.tabela === 'perfis_julgador')!.linha).toMatchObject({ usuario_id: 'u1', nome: 'Ana Souza', tribunal: 'TJRJ' })
  })

  it('só o órgão: sem manchetes; só o nome: sem DataJud; sonda do cron não grava o histórico', async () => {
    let b = await (await chamar({ orgao: '3ª Vara', tribunal: 'tjsp' })).json()
    expect(b.noticias).toEqual([]); expect(b.estatisticas.processos).toBe(120)
    expect(pedidos.some(p => p.url.includes('news.google'))).toBe(false)
    pedidos.length = 0
    b = await (await chamar({ nome: 'Ana', sonda: true }, { 'x-cron-secret': 'segredo' })).json()
    expect(b.estatisticas).toBeNull(); expect(b.noticias).toHaveLength(1)
    expect(pedidos.some(p => p.url.includes('datajud'))).toBe(false)
    expect(estado.inseridos.filter(i => i.tabela === 'perfis_julgador')).toHaveLength(1)
    expect(estado.inseridos.filter(i => i.tabela === 'consumo_api').at(-1)!.linha).toMatchObject({ usuario_id: null })
  })

  it('normaliza listas vindas como texto JSON ou objeto e junta chaves numéricas soltas em cuidados; confiança fora da lista vira baixa; DataJud fora do ar não derruba', async () => {
    datajud = () => new Response('', { status: 503 })
    ia = () => jsonResp({ content: [{ type: 'tool_use', input: { resumo: 'R', tendencias: '["a","b"]', temas: { x: 't1' }, comoArgumentar: 'texto solto', cuidados: [], confianca: 'enorme', '1': 'extra' } }] })
    const b = await (await chamar({ nome: 'Ana', orgao: 'Vara' })).json()
    expect(b).toMatchObject({ resumo: 'R', tendencias: ['a', 'b'], temas: ['t1'], comoArgumentar: ['texto solto'], cuidados: ['extra'], confianca: 'baixa', estatisticas: null })
  })

  it('teto mensal atingido é 429 sem chamar a IA; sobrecarga tenta de novo e cai para o modelo de reserva; chave recusada; sem ferramenta na resposta', async () => {
    estado.rpcResposta.teto_consumo_atingido = true
    expect((await chamar({ nome: 'Ana' })).status).toBe(429)
    expect(pedidos.some(p => p.url.includes('anthropic'))).toBe(false)
    estado.rpcResposta.teto_consumo_atingido = false
    ia = c => (c.model === 'claude-sonnet-5-5' ? new Response('ocupado', { status: 529 }) : jsonResp({ content: [{ type: 'tool_use', input: PERFIL }] }))
    const p = chamar({ nome: 'Ana' })
    await vi.advanceTimersByTimeAsync(5000)
    const b = await (await p).json()
    expect(b.resumo).toBe(PERFIL.resumo)
    expect(pedidos.filter(x => x.url.includes('anthropic')).map(x => x.corpo!.model)).toEqual(['claude-sonnet-5-5', 'claude-sonnet-5-5', 'claude-haiku-5-5'])
    ia = () => new Response('', { status: 401 })
    let r = await chamar({ nome: 'Ana' })
    expect(r.status).toBe(502); expect((await r.json()).erro).toBe('Chave recusada pela Anthropic.')
    ia = () => jsonResp({ content: [{ type: 'text', text: 'sem ferramenta' }] })
    r = await chamar({ nome: 'Ana' })
    expect(r.status).toBe(502); expect((await r.json()).erro).toContain('não devolveu o perfil')
  })
})
