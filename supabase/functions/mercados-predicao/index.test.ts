// Bloco B15: leitor diário de mercados de predição (Polymarket, Kalshi) e Epoch AI. Só números, só leitura.
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { fingirDeno, fingirFetch } from '../_testes/deno'
import { zerar, estado } from '../_testes/supabase-js'

const caixa = fingirDeno({ SUPABASE_URL: 'https://db', SUPABASE_SERVICE_ROLE_KEY: 'k' })
const mod = await import('./index')
const chamar = (segredo: string | null) => caixa.handler!(new Request('https://x.functions.supabase.co/mercados-predicao', { method: 'POST', headers: segredo ? { 'x-cron-secret': segredo } : {} }))
const hoje = new Date().toISOString().slice(0, 10)

const respostas: Record<string, () => Response> = {}
beforeEach(() => {
  for (const k of Object.keys(respostas)) delete respostas[k]
  fingirFetch(u => { const k = Object.keys(respostas).find(x => u.includes(x)); return k ? respostas[k]!() : new Response('x', { status: 500 }) })
  zerar({ configuracoes: [{ chave: 'cron_segredo', valor: 'cron-1' }] })
  vi.spyOn(globalThis, 'setTimeout').mockImplementation(((fn: () => void) => { fn(); return 0 }) as unknown as typeof setTimeout)
})

describe('mercados-predicao', () => {
  it('só o cron com o segredo lê', async () => {
    expect((await chamar(null)).status).toBe(401)
    expect((await chamar('errado')).status).toBe(401)
  })

  it('Polymarket: só mercados relevantes, preço do Yes, volume e desfecho quando fechado', () => {
    const ms = mod.lerPolymarket([
      { title: 'Brazil election 2026', markets: [
        { question: 'Will Lula win?', slug: 'lula-win-2026', outcomes: '["Yes","No"]', outcomePrices: '["0.57","0.43"]', volumeNum: 123456.7, endDate: '2026-10-04T00:00:00Z', closed: false },
        { question: 'Broken prices', slug: 'x', outcomes: '["Yes","No"]', outcomePrices: 'nope' },
      ] },
      { title: 'Super Bowl winner', markets: [{ question: 'Chiefs?', slug: 'chiefs', outcomes: '["Yes","No"]', outcomePrices: '["0.2","0.8"]' }] },
      { title: 'Fed decision', markets: [{ question: 'Fed cuts rates in December?', slug: 'fed-dec', outcomes: '["No","Yes"]', outcomePrices: '["0.1","0.9"]', closed: true }] },
    ])
    expect(ms).toHaveLength(2)
    expect(ms[0]).toMatchObject({ fonte: 'polymarket', id: 'lula-win-2026', p_sim: 0.57, volume: 123456.7, fecha_em: '2026-10-04', resolvido: null })
    expect(ms[1]).toMatchObject({ id: 'fed-dec', p_sim: 0.9, resolvido: 1 })
    const s = mod.paraSeries(ms, hoje)
    expect(s).toContainEqual({ fonte: 'mercados', serie: 'polymarket:lula-win-2026:p', data_ref: hoje, valor: 0.57 })
    expect(s).toContainEqual({ fonte: 'mercados', serie: 'polymarket:fed-dec:resolvido', data_ref: hoje, valor: 1 })
    expect(JSON.stringify(s)).not.toContain('Lula') // séries não levam título; títulos vão à tabela própria
  })

  it('Kalshi: ponto médio bid/ask em centavos; liquidado vira desfecho', () => {
    const ms = mod.lerKalshi({ markets: [
      { ticker: 'BRAZIL-26', title: 'Brazil GDP growth above 2%?', yes_bid: 40, yes_ask: 44, volume: 900, close_time: '2026-12-31T23:00:00Z', status: 'open' },
      { ticker: 'FED-DEC', title: 'Fed cuts in December?', yes_bid: 0, yes_ask: 0, last_price: 72, status: 'settled', result: 'no' },
      { ticker: 'NBA-1', title: 'Lakers win?', yes_bid: 50, yes_ask: 52 },
    ] })
    expect(ms).toHaveLength(2)
    expect(ms[0]).toMatchObject({ fonte: 'kalshi', id: 'brazil-26', p_sim: 0.42, volume: 900, fecha_em: '2026-12-31', resolvido: null })
    expect(ms[1]).toMatchObject({ id: 'fed-dec', p_sim: 0.72, resolvido: 0 })
  })

  it('Epoch AI: conta modelos e o maior treino em log10 FLOP; CSV vazio não quebra', () => {
    const csv = 'Model,Organization,"Training compute (FLOP)"\n"A, Inc model",X,1e25\nB,Y,"5e26"\nC,Z,\n'
    expect(mod.lerEpoch(csv)).toEqual({ modelos: 3, log10_compute_max: 26.7 })
    expect(mod.lerEpoch('')).toEqual({ modelos: 0, log10_compute_max: null })
  })

  it('coleta as 8 fontes, grava séries e títulos; falha vira lacuna registrada', async () => {
    respostas['tag_slug=brazil'] = () => new Response(JSON.stringify([{ title: 'Brazil', markets: [{ question: 'Selic below 12% by June?', slug: 'selic-12', outcomes: '["Yes","No"]', outcomePrices: '["0.33","0.67"]', volumeNum: 10 }] }]))
    respostas['tag_slug=economy'] = () => new Response('[]'); respostas['tag_slug=ai'] = () => new Response('[]'); respostas['tag_slug=politics'] = () => new Response('[]')
    respostas['closed=true'] = () => new Response(JSON.stringify([{ question: 'Brazil rate cut in 2025?', slug: 'br-cut-25', outcomes: '["Yes","No"]', outcomePrices: '["1","0"]', closed: true }]))
    respostas['status=open'] = () => new Response(JSON.stringify({ markets: [{ ticker: 'BR-X', title: 'Brazil inflation above 5%?', yes_bid: 30, yes_ask: 34 }] }))
    respostas['notable_ai_models'] = () => new Response('Model,"Training compute (FLOP)"\nA,1e24\n')
    const b = await (await chamar('cron-1')).json()
    expect(b.fontes).toBe(8)
    expect(b.ok).toBe(7) // kalshi:liquidados cai no 500 padrão
    const grav = estado.rpcs.filter(r => r.nome === 'instituto_motor_gravar').map(r => r.args as { p_coleta: { fonte: string; ok: boolean }; p_series: { serie: string; valor: number }[] })
    expect(grav).toHaveLength(8)
    const por = (n: string) => grav.find(g => g.p_coleta.fonte === n)!
    expect(por('polymarket:brazil').p_series.map(s => s.serie)).toEqual(['polymarket:selic-12:p', 'polymarket:selic-12:volume'])
    expect(por('polymarket:fechados').p_series).toEqual([{ fonte: 'mercados', serie: 'polymarket:br-cut-25:resolvido', data_ref: hoje, valor: 1 }])
    expect(por('kalshi:abertos').p_series[0]).toMatchObject({ serie: 'kalshi:br-x:p', valor: 0.32 })
    expect(por('kalshi:liquidados').p_coleta.ok).toBe(false)
    expect(por('epoch_ai:modelos_notaveis').p_series).toEqual([{ fonte: 'epoch_ai', serie: 'modelos_notaveis_n', data_ref: hoje, valor: 1 }, { fonte: 'epoch_ai', serie: 'log10_compute_max', data_ref: hoje, valor: 24 }])
    const titulos = estado.rpcs.filter(r => r.nome === 'instituto_mercados_titulos').map(r => (r.args as { p_titulos: Record<string, string> }).p_titulos)
    expect(titulos).toContainEqual({ 'polymarket:selic-12': 'Selic below 12% by June?' })
  })
})
