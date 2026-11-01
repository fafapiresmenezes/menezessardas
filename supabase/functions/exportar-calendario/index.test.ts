// Passo 535: Edge Function exportar-calendario — iCal dos vencimentos e link do Google Agenda.
import { describe, it, expect, beforeEach } from 'vitest'
import { fingirDeno, fingirFetch, jsonResp } from '../_testes/deno'

const caixa = fingirDeno({ SUPABASE_URL: 'https://db.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'chave-servico' })
await import('./index')
const chamar = (qs = '', auth: string | null = 'Bearer token-do-usuario') =>
  caixa.handler!(new Request(`https://x.functions.supabase.co/exportar-calendario${qs}`, { headers: auth ? { Authorization: auth } : {} }))

let contratos: unknown[] = []
let status = 200
const pedidos: { url: string; headers: Record<string, string> }[] = []
beforeEach(() => {
  contratos = []; status = 200; pedidos.length = 0
  fingirFetch((u, init) => { pedidos.push({ url: u, headers: (init?.headers ?? {}) as Record<string, string> }); return status === 200 ? jsonResp(contratos) : new Response('', { status }) })
})

describe('exportar-calendario', () => {
  it('exige autenticação e repassa o token do usuário ao banco só com vencimentos futuros', async () => {
    expect((await chamar('', null)).status).toBe(401)
    await chamar()
    expect(pedidos[0]!.url).toMatch(/^https:\/\/db\.supabase\.co\/rest\/v1\/contratos\?/)
    expect(pedidos[0]!.url).toContain('data_vencimento=gte.')
    expect(pedidos[0]!.headers).toMatchObject({ apikey: 'chave-servico', Authorization: 'Bearer token-do-usuario' })
  })

  it('gera um .ics com um VEVENT por contrato com vencimento, alarme 7 dias antes, e pula os sem data', async () => {
    contratos = [
      { id: 'c1', locatario_fornecedor: 'Loja X', data_vencimento: '2027-03-15', valor_periodico: 5000, imoveis: { endereco: 'Rua A, 10' } },
      { id: 'c2', locatario_fornecedor: 'Sem data', data_vencimento: null, valor_periodico: 1, imoveis: null },
    ]
    const r = await chamar()
    expect(r.headers.get('Content-Type')).toContain('text/calendar')
    expect(r.headers.get('Content-Disposition')).toContain('contratos.ics')
    const ics = await r.text()
    expect(ics.startsWith('BEGIN:VCALENDAR')).toBe(true)
    expect(ics.split('BEGIN:VEVENT').length - 1).toBe(1)
    expect(ics).toContain('UID:c1@')
    expect(ics).toContain('DTSTART;VALUE=DATE:20270315')
    expect(ics).toContain('SUMMARY:VENCIMENTO - Rua A, 10')
    expect(ics).toContain('Valor: R$ 5000.00')
    expect(ics).toContain('TRIGGER:-P7D')
    expect(ics).toContain('X-WR-TIMEZONE:America/Sao_Paulo')
    expect(ics.endsWith('END:VCALENDAR')).toBe(true)
  })

  it('formato google devolve o link do primeiro vencimento e o total; sem contratos dá 404; erro do banco repassa o status', async () => {
    contratos = [{ id: 'c1', locatario_fornecedor: 'Loja X', data_vencimento: '2027-03-15', valor_periodico: 1, imoveis: { endereco: 'Rua A' } }, { id: 'c2', locatario_fornecedor: 'Y', data_vencimento: '2027-04-01', valor_periodico: 1 }]
    const b = await (await chamar('?formato=google')).json()
    expect(b.total).toBe(2)
    expect(b.url).toContain('calendar.google.com')
    expect(b.url).toContain('dates=20270315/20270315')
    expect(b.url).toContain(encodeURIComponent('Vencimento: Rua A'))
    contratos = []
    expect((await chamar('?formato=google')).status).toBe(404)
    status = 403
    expect((await chamar()).status).toBe(403)
  })
})
