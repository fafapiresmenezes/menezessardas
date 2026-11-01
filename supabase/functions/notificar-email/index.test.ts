// Passo 554: Edge Function notificar-email — avisos de vencimento em 7 dias pela API REST do banco e Resend (função antiga, mantida).
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { fingirDeno, fingirFetch, jsonResp } from '../_testes/deno'

const env: Record<string, string> = { SUPABASE_URL: 'https://db.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'k', RESEND_API_KEY: 'rk' }
const caixa = fingirDeno(env)
await import('./index')
const chamar = (headers: Record<string, string> = { Authorization: 'Bearer t' }) => caixa.handler!(new Request('https://x.functions.supabase.co/notificar-email', { method: 'POST', headers }))
const emDias = (n: number) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10)

let rest: () => Response
let resend: () => Response
const chamadas: { url: string; init?: RequestInit }[] = []
beforeEach(() => {
  chamadas.length = 0
  env.RESEND_API_KEY = 'rk'
  vi.spyOn(console, 'error').mockImplementation(() => {})
  rest = () => jsonResp([
    { id: 'c1', locatario_fornecedor: 'Loja Alfa', data_vencimento: emDias(3), valor_periodico: 2500.5, imoveis: { endereco: 'Rua A, 1', proprietario_nome: 'Dona Ana' } },
    { id: 'c2', locatario_fornecedor: null, data_vencimento: emDias(6), valor_periodico: null, imoveis: null },
  ])
  resend = () => jsonResp({ id: 'e1' })
  fingirFetch((u, init) => { chamadas.push({ url: u, init }); return u.includes('/rest/v1/') ? rest() : resend() })
})

describe('notificar-email', () => {
  it('sem cabeçalho de autorização é 401; OPTIONS passa', async () => {
    expect((await chamar({})).status).toBe(401)
    expect((await caixa.handler!(new Request('https://x/notificar-email', { method: 'OPTIONS' }))).status).toBe(200)
    expect(chamadas).toHaveLength(0)
  })

  it('busca os contratos dos próximos 7 dias com o token de quem chamou e envia um e-mail por contrato, urgente quando faltam 7 dias ou menos', async () => {
    const b = await (await chamar()).json()
    expect(b).toMatchObject({ total: 2, notificacoes_geradas: 2, emails_enviados: 2, erros: 0 })
    const consulta = chamadas[0]!
    expect(consulta.url).toContain(`data_vencimento=gte.${emDias(0)}`)
    expect(consulta.url).toContain(`data_vencimento=lte.${emDias(7)}`)
    expect((consulta.init!.headers as Record<string, string>).Authorization).toBe('Bearer t')
    const envios = chamadas.slice(1).map(c => JSON.parse(String(c.init!.body)))
    expect(envios[0].subject).toContain('URGENTE')
    expect(envios[0].subject).toContain('vence em 3 dias')
    expect(envios[0].html).toContain('Dona Ana')
    expect(envios[0].html).toContain('Rua A, 1')
    expect(envios[0].html).toContain('R$ 2500.50')
    expect(envios[1].html).toContain('Cliente')
    expect(envios[1].html).toContain('Imóvel desconhecido')
    expect(envios[1].html).toContain('Sem nome')
    expect((chamadas[1]!.init!.headers as Record<string, string>).Authorization).toBe('Bearer rk')
  })

  it('erro do banco repassa o status; sem chave do Resend conta como erro de envio; Resend fora do ar também', async () => {
    rest = () => new Response('', { status: 403 })
    const r = await chamar()
    expect(r.status).toBe(403); expect((await r.json()).erro).toBe('Erro ao buscar contratos')
    rest = () => jsonResp([{ id: 'c1', data_vencimento: emDias(1), imoveis: null }])
    env.RESEND_API_KEY = ''
    expect(await (await chamar()).json()).toMatchObject({ total: 1, emails_enviados: 0, erros: 1 })
    env.RESEND_API_KEY = 'rk'
    resend = () => { throw new Error('rede') }
    expect(await (await chamar()).json()).toMatchObject({ emails_enviados: 0, erros: 1 })
  })
})
