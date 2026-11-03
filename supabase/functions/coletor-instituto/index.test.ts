// Passo 550: Edge Function coletor-instituto — coleta diária anonimizada do DataJud e volume do DJEN para o Instituto THEYE.
import { describe, it, expect, beforeEach } from 'vitest'
import { fingirDeno, fingirFetch, jsonResp } from '../_testes/deno'
import { zerar, estado } from '../_testes/supabase-js'

const caixa = fingirDeno({ SUPABASE_URL: 'https://db.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'k', COLETOR_ESPERA_MS: '1' })
await import('./index')
const chamar = (corpo: unknown = {}, headers: Record<string, string> = { 'x-cron-secret': 'segredo' }) =>
  caixa.handler!(new Request('https://x.functions.supabase.co/coletor-instituto', { method: 'POST', body: JSON.stringify(corpo), headers: { 'Content-Type': 'application/json', ...headers } }))
const sha256 = async (t: string) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t)))).map(b => b.toString(16).padStart(2, '0')).join('')

const PROCESSO = { numeroProcesso: '00000012320248190001', classe: { nome: 'Despejo', codigo: 93 }, orgaoJulgador: { nome: '2ª Vara' }, assuntos: [[{ codigo: 9, nome: 'Locação' }]],
  dataAjuizamento: '20240115000000', dataHoraUltimaAtualizacao: '2026-03-01T00:00:00',
  movimentos: [{ codigo: 26, dataHora: '2024-01-15T10:00:00' }, { codigo: 219, dataHora: '2025-06-01T10:00:00' }, { codigo: 51, dataHora: '2025-07-01T10:00:00' }] }
let datajud: (url: string, corpo: Record<string, unknown>) => Response
let djen: (url: string) => Response
const pedidos: { url: string; corpo?: Record<string, unknown> }[] = []
beforeEach(() => {
  pedidos.length = 0
  datajud = () => jsonResp({ hits: { hits: [{ _source: PROCESSO }] } })
  djen = () => jsonResp({ count: 42 })
  fingirFetch((u, init) => {
    const corpo = init?.body ? JSON.parse(String(init.body)) : undefined
    pedidos.push({ url: u, corpo })
    if (u.includes('datajud')) return datajud(u, corpo)
    if (u.includes('comunicaapi')) return djen(u)
    return new Response('', { status: 500 })
  })
  zerar({ configuracoes: [{ chave: 'cron_segredo', valor: 'segredo' }] })
  estado.rpcResposta.instituto_gravar_coleta = { novos: 1, atualizados: 0 }
})

describe('coletor-instituto', () => {
  it('só roda com o segredo do cron', async () => {
    expect((await chamar({}, {})).status).toBe(401)
    expect((await chamar({}, { 'x-cron-secret': 'x' })).status).toBe(401)
    expect(pedidos).toHaveLength(0)
  })

  it('anonimiza o processo (número vira sha256), guarda só códigos e datas, acha o desfecho pelo último movimento de mérito e grava pela função SQL com o volume do DJEN', async () => {
    const b = await (await chamar({ tribunais: ['tjrj'], classes: ['Despejo'] })).json()
    expect(b).toMatchObject({ ok: true, vistos: 1, novos: 1, djen: [{ tribunal: 'TJRJ', comunicacoes: 42 }], falhas: [] })
    expect(b.djen[0].dia).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    const consulta = pedidos.find(p => p.url.includes('api_publica_tjrj'))!
    expect(consulta.corpo).toMatchObject({ size: 100, from: 0, query: { bool: { filter: [{ match_phrase: { 'classe.nome': 'Despejo' } }] } } })
    expect(estado.rpcs).toHaveLength(1)
    const args = estado.rpcs[0]!.args as { p_processos: Record<string, unknown>[]; p_djen: unknown[]; p_falhas: unknown }
    const p = args.p_processos[0]!
    expect(p.id).toBe(await sha256('tjrj:00000012320248190001'))
    expect(JSON.stringify(p)).not.toContain('00000012320248190001')
    expect(p).toMatchObject({ tribunal: 'TJRJ', classe: 'Despejo', classe_codigo: 93, orgao: '2ª Vara', assuntos: [{ c: 9, n: 'Locação' }], data_ajuizamento: '2024-01-15', desfecho: 'procedencia', data_desfecho: '2025-06-01', n_movimentos: 3 })
    expect(p.movimentos).toEqual([{ c: 26, d: '2024-01-15' }, { c: 219, d: '2025-06-01' }, { c: 51, d: '2025-07-01' }])
    expect(args.p_djen).toHaveLength(1)
    expect(args.p_falhas).toEqual([])
  })

  it('o mesmo processo em duas classes entra uma vez; falhas do DataJud e do DJEN ficam na lista sem derrubar a coleta; tamanho e salto são limitados', async () => {
    datajud = (u, corpo) => (corpo.query as any).bool.filter[0].match_phrase['classe.nome'] === 'Revisional de Aluguel' ? new Response('', { status: 503 }) : jsonResp({ hits: { hits: [{ _source: PROCESSO }] } })
    djen = () => new Response('', { status: 429 })
    const b = await (await chamar({ tribunais: ['tjrj'], classes: ['Despejo', 'Renovatória de Locação', 'Revisional de Aluguel'], por: 9999, pular: -5 })).json()
    expect(b.vistos).toBe(1)
    expect(b.falhas).toEqual(['tjrj/Revisional de Aluguel: 503', 'djen tjrj: 429'])
    expect(pedidos[0]!.corpo).toMatchObject({ size: 400, from: 0 })
    expect(b.djen).toEqual([])
  })

  it('C18: 429 passageiro do DataJud é repetido e a coleta sai sem falha; 404 não é repetido', async () => {
    let n = 0
    datajud = () => (++n === 1 ? new Response('', { status: 429 }) : jsonResp({ hits: { hits: [{ _source: PROCESSO }] } }))
    const b = await (await chamar({ tribunais: ['tjdft'], classes: ['Despejo'] })).json()
    expect(b.falhas).toEqual([])
    expect(b.vistos).toBe(1)
    expect(n).toBe(2)
    n = 0
    datajud = () => (++n, new Response('', { status: 404 }))
    const c = await (await chamar({ tribunais: ['tjdft'], classes: ['Despejo'] })).json()
    expect(c.falhas).toEqual(['tjdft/Despejo: 404'])
    expect(n).toBe(1)
  })

  it('erro da função SQL devolve 500 com até onde gravou', async () => {
    estado.rpcErro.instituto_gravar_coleta = 'tabela ausente'
    const r = await chamar({ tribunais: ['tjsp'], classes: ['Despejo'] })
    expect(r.status).toBe(500)
    expect(await r.json()).toMatchObject({ erro: 'tabela ausente', gravados_ate: 0 })
  })
})
