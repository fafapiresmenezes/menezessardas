// Passo 539: Edge Function intimacoes — DJEN (Comunica PJe) pelas OABs do escritório, com paginação e sem repetir.
import { describe, it, expect, beforeEach } from 'vitest'
import { fingirDeno, fingirFetch, jsonResp } from '../_testes/deno'
import { zerar, estado } from '../_testes/supabase-js'

const caixa = fingirDeno({ SUPABASE_URL: 'https://db', SUPABASE_SERVICE_ROLE_KEY: 'k', INTIMACOES_ESPERA_MS: '0' })
await import('./index')
const jwt = (payload: object) => `h.${btoa(JSON.stringify(payload)).replace(/=+$/, '')}.s`
const chamar = (body: unknown = {}, headers: Record<string, string> = { authorization: `Bearer ${jwt({ role: 'authenticated' })}` }) =>
  caixa.handler!(new Request('https://x.functions.supabase.co/intimacoes', { method: 'POST', headers, body: JSON.stringify(body) }))

let paginas: Record<string, unknown[][]>
const pedidos: string[] = []
beforeEach(() => {
  pedidos.length = 0
  paginas = {}
  fingirFetch(u => {
    pedidos.push(u)
    const url = new URL(u)
    const chave = `${url.searchParams.get('numeroOab')}/${url.searchParams.get('ufOab')}`
    const pg = Number(url.searchParams.get('pagina'))
    const lista = paginas[chave]
    if (!lista) return new Response('', { status: 500 })
    return jsonResp({ items: lista[pg - 1] ?? [] })
  })
  zerar({ configuracoes: [{ chave: 'cron_segredo', valor: 'cron-1' }, { chave: 'oabs_monitoradas', valor: '12345/RJ, 999/SP' }], intimacoes: [] })
})

describe('intimacoes', () => {
  it('aceita usuário logado ou o segredo do cron; recusa o resto', async () => {
    expect((await chamar({}, {})).status).toBe(401)
    expect((await chamar({}, { 'x-cron-secret': 'errado' })).status).toBe(401)
    paginas = { '12345/RJ': [[]], '999/SP': [[]] }
    expect((await chamar({}, { 'x-cron-secret': 'cron-1' })).status).toBe(200)
  })

  it('sem OAB cadastrada responde com aviso e não consulta o DJEN', async () => {
    estado.tabelas.configuracoes = [{ chave: 'oabs_monitoradas', valor: '' }]
    const b = await (await chamar()).json()
    expect(b).toMatchObject({ oabs: [], novas: 0 })
    expect(b.aviso).toContain('Nenhuma OAB')
    expect(pedidos).toHaveLength(0)
  })

  it('consulta cada OAB no período, limpa o HTML do texto, guarda sem repetir e conta só as novas; OAB com falha entra na lista', async () => {
    const item = (id: number) => ({ id, data_disponibilizacao: '2026-11-01', siglaTribunal: 'TJRJ', nomeOrgao: '1ª Vara', tipoComunicacao: 'Intimação', nomeClasse: 'Despejo', numeroprocessocommascara: `000${id}-11.2026.8.19.0001`, texto: `<p>Fica <b>intimado</b>   o réu</p>`, link: 'https://x', destinatarios: [] })
    paginas = { '12345/RJ': [[item(1), item(2)]] }
    estado.tabelas.intimacoes = [{ id: 1 }]
    const b = await (await chamar({ dias: 7 })).json()
    expect(b.oabs).toEqual(['12345/RJ', '999/SP'])
    expect(b.novas).toBe(1)
    expect(b.falhas).toEqual(['999/SP: 500'])
    expect(pedidos[0]).toContain('numeroOab=12345&ufOab=RJ')
    expect(pedidos[0]).toContain('itensPorPagina=100&pagina=1')
    const inicioEsperado = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10)
    expect(b.periodo).toEqual({ inicio: inicioEsperado, fim: new Date().toISOString().slice(0, 10) })
    expect(estado.upserts.filter(u => u.tabela === 'intimacoes')).toHaveLength(2)
    expect(estado.upserts[0]!.linha).toMatchObject({ id: 1, oab: '12345/RJ', tribunal: 'TJRJ', tipo: 'Intimação', numero_processo: '0001-11.2026.8.19.0001', texto: 'Fica intimado o réu' })
  })

  it('pagina enquanto a página vem cheia (até 5) e limita o período a 60 dias', async () => {
    const cheia = Array.from({ length: 100 }, (_, i) => ({ id: i + 1, texto: '' }))
    paginas = { '12345/RJ': [cheia, cheia, [{ id: 500, texto: '' }]], '999/SP': [[]] }
    const b = await (await chamar({ dias: 400 })).json()
    expect(pedidos.filter(p => p.includes('numeroOab=12345')).length).toBe(3)
    expect(b.novas).toBe(201)
    const inicio = new Date(Date.now() - 60 * 86400000).toISOString().slice(0, 10)
    expect(b.periodo.inicio).toBe(inicio)
  })

  it('aceita inicio e fim pedidos (até 93 dias) e devolve o período usado', async () => {
    paginas = { '12345/RJ': [[]], '999/SP': [[]] }
    const b = await (await chamar({ inicio: '2025-01-01', fim: '2025-02-15' })).json()
    expect(b.periodo).toEqual({ inicio: '2025-01-01', fim: '2025-02-15' })
    expect(pedidos[0]).toContain('dataDisponibilizacaoInicio=2025-01-01')
    expect(pedidos[0]).toContain('dataDisponibilizacaoFim=2025-02-15')
  })

  it('recusa período invertido ou maior que 93 dias', async () => {
    const a = await chamar({ inicio: '2025-03-01', fim: '2025-01-01' })
    expect(a.status).toBe(400)
    const c = await chamar({ inicio: '2025-01-01', fim: '2025-06-01' })
    expect(c.status).toBe(400)
    expect((await c.json()).erro).toContain('93 dias')
    expect(pedidos).toHaveLength(0)
  })

  it('no modo histórico pagina até 10 vezes e já marca como lidas as intimações com mais de 60 dias', async () => {
    const cheia = (base: number) => Array.from({ length: 100 }, (_, i) => ({ id: base + i, texto: '', data_disponibilizacao: '2024-05-10' }))
    const recente = new Date(Date.now() - 5 * 86400000).toISOString().slice(0, 10)
    paginas = { '12345/RJ': [...Array.from({ length: 9 }, (_, k) => cheia(k * 100 + 1)), [{ id: 9001, texto: '', data_disponibilizacao: recente }, ...cheia(2000)]], '999/SP': [[]] }
    const b = await (await chamar({ inicio: '2024-05-01', fim: '2024-05-30', historico: true })).json()
    expect(pedidos.filter(p => p.includes('numeroOab=12345')).length).toBe(10)
    expect(b.novas).toBe(1001)
    const linhas = estado.upserts.filter(u => u.tabela === 'intimacoes').map(u => u.linha as { id: number; lida?: boolean })
    expect(linhas.find(l => l.id === 1)!.lida).toBe(true)
    expect(linhas.find(l => l.id === 9001)!.lida).toBeUndefined()
  })

  it('sem o modo histórico a intimação antiga não é marcada como lida', async () => {
    paginas = { '12345/RJ': [[{ id: 1, texto: '', data_disponibilizacao: '2024-05-10' }]], '999/SP': [[]] }
    await chamar({ inicio: '2024-05-01', fim: '2024-05-30' })
    expect((estado.upserts.find(u => u.tabela === 'intimacoes')!.linha as { lida?: boolean }).lida).toBeUndefined()
  })

  it('tenta de novo quando o CNJ oscila (500) e conta como sucesso se a segunda tentativa responde', async () => {
    let n = 0
    fingirFetch(u => { pedidos.push(u); n++; return n === 1 ? new Response('', { status: 503 }) : jsonResp({ items: [] }) })
    estado.tabelas.configuracoes = [{ chave: 'oabs_monitoradas', valor: '12345/RJ' }]
    const b = await (await chamar()).json()
    expect(b.falhas).toEqual([])
    expect(pedidos).toHaveLength(2)
  })

  it('erro 4xx não é repetido e fica registrado como falha', async () => {
    fingirFetch(u => { pedidos.push(u); return new Response('', { status: 400 }) })
    estado.tabelas.configuracoes = [{ chave: 'oabs_monitoradas', valor: '12345/RJ' }]
    const b = await (await chamar()).json()
    expect(b.falhas).toEqual(['12345/RJ: 400'])
    expect(pedidos).toHaveLength(1)
  })

  it('grava o resultado da última consulta (ok ou com falha) e o último sucesso; histórico não mexe nesse registro', async () => {
    paginas = { '12345/RJ': [[]], '999/SP': [[]] }
    await chamar({}, { 'x-cron-secret': 'cron-1' })
    const reg = estado.upserts.filter(u => u.tabela === 'configuracoes').map(u => u.linha as { chave: string; valor: string })
    expect(JSON.parse(reg.find(r => r.chave === 'cnj_ultima_consulta')!.valor)).toMatchObject({ ok: true, origem: 'automatica', falhas: [] })
    expect(reg.some(r => r.chave === 'cnj_ultimo_sucesso')).toBe(true)
    estado.upserts.length = 0
    paginas = { '12345/RJ': [[]] }
    await chamar()
    const r2 = estado.upserts.filter(u => u.tabela === 'configuracoes').map(u => u.linha as { chave: string; valor: string })
    expect(JSON.parse(r2.find(r => r.chave === 'cnj_ultima_consulta')!.valor)).toMatchObject({ ok: false, origem: 'manual' })
    expect(r2.some(r => r.chave === 'cnj_ultimo_sucesso')).toBe(false)
    estado.upserts.length = 0
    await chamar({ inicio: '2024-01-01', fim: '2024-01-30', historico: true })
    expect(estado.upserts.filter(u => u.tabela === 'configuracoes')).toHaveLength(0)
  })

  it('"teste" só confere a conexão com o CNJ: não precisa de OAB e não grava nada', async () => {
    paginas = { '1/RJ': [[]] }
    estado.tabelas.configuracoes = [{ chave: 'oabs_monitoradas', valor: '' }]
    const b = await (await chamar({ teste: true })).json()
    expect(b).toMatchObject({ conexao: true, status: 200 })
    expect(estado.upserts).toHaveLength(0)
  })
})
