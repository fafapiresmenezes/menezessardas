// Passo 539: Edge Function intimacoes — DJEN (Comunica PJe) pelas OABs do escritório, com paginação e sem repetir.
import { describe, it, expect, beforeEach } from 'vitest'
import { fingirDeno, fingirFetch, jsonResp } from '../_testes/deno'
import { zerar, estado } from '../_testes/supabase-js'

const caixa = fingirDeno({ SUPABASE_URL: 'https://db', SUPABASE_SERVICE_ROLE_KEY: 'k' })
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
    expect(estado.upserts).toHaveLength(2)
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
})
