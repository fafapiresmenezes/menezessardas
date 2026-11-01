// Passo 545: Edge Function coletor-motor — motor THE EYE na nuvem: 10 fontes públicas, séries numéricas e sha256 por coleta.
import { describe, it, expect, beforeEach } from 'vitest'
import { fingirDeno, fingirFetch } from '../_testes/deno'
import { zerar, estado } from '../_testes/supabase-js'

const caixa = fingirDeno({ SUPABASE_URL: 'https://db', SUPABASE_SERVICE_ROLE_KEY: 'k' })
await import('./index')
const chamar = (segredo: string | null) => caixar(segredo)
const caixar = (segredo: string | null) => caixa.handler!(new Request('https://x.functions.supabase.co/coletor-motor', { method: 'POST', headers: segredo ? { 'x-cron-secret': segredo } : {} }))

const respostas: Record<string, () => Response> = {}
beforeEach(() => {
  for (const k of Object.keys(respostas)) delete respostas[k]
  fingirFetch(u => { const k = Object.keys(respostas).find(x => u.includes(x)); return k ? respostas[k]!() : new Response('x', { status: 500 }) })
  zerar({ configuracoes: [{ chave: 'cron_segredo', valor: 'cron-1' }] })
})

describe('coletor-motor', () => {
  it('só o cron com o segredo coleta', async () => {
    expect((await chamar(null)).status).toBe(401)
    expect((await chamar('errado')).status).toBe(401)
  })

  it('coleta as 10 fontes, grava cada uma pela RPC com sha256 e manda as séries numéricas válidas', async () => {
    respostas['bcdata.sgs.189'] = () => new Response(JSON.stringify([{ data: '01/09/2026', valor: '0.30' }, { data: '01/10/2026', valor: '0.45' }]))
    respostas['olinda.bcb.gov.br'] = () => new Response(JSON.stringify({ value: [{ Data: '2026-10-31', DataReferencia: '2027', Mediana: 3.9 }, { Data: '2026-10-31', DataReferencia: '2027', Mediana: 3.9 }] }))
    respostas['apisidra'] = () => new Response(JSON.stringify([{ cabecalho: 1 }, { D3C: '202609', V: '0.48' }, { D3C: '202610', V: '...' }]))
    respostas['worldbank'] = () => new Response(JSON.stringify([{}, [{ date: '2025', value: 4.4 }, { date: '2024', value: null }]]))
    respostas['focos_diario'] = () => new Response('cabecalho\nlinha1\nlinha2\n')
    respostas['camara'] = () => new Response(JSON.stringify({ dados: [1, 2, 3] }))
    respostas['openalex'] = () => new Response(JSON.stringify({ results: [1] }))
    const b = await (await chamar('cron-1')).json()
    expect(b.fontes).toBe(10)
    expect(b.ok).toBe(7) // três séries do SGS (ipca, selic, dólar) caem no 500 padrão
    expect(b.dia).toBe(new Date().toISOString().slice(0, 10))
    const por = Object.fromEntries((b.resultado as { fonte: string }[]).map(r => [r.fonte, r]))
    expect(por['bcb_sgs:igpm']).toMatchObject({ ok: true, status: 200, itens: 2 })
    expect(String((por['bcb_sgs:igpm'] as { sha256: string }).sha256)).toMatch(/^[0-9a-f]{64}$/)
    expect(por['bcb_sgs:ipca']).toMatchObject({ ok: false, status: 500, itens: 0, erro: 'HTTP 500' })
    expect(por['bcb_olinda:focus_ipca']).toMatchObject({ ok: true, itens: 2 })
    expect(por['inpe_queimadas']).toMatchObject({ ok: true, itens: 2 })
    expect(por['camara_dados_abertos']).toMatchObject({ ok: true, itens: 3 })
    const grav = estado.rpcs.filter(r => r.nome === 'instituto_motor_gravar').map(r => r.args as { p_coleta: { fonte: string }; p_series: unknown[] })
    expect(grav).toHaveLength(10)
    const series = (f: string) => grav.find(g => g.p_coleta.fonte === f)!.p_series
    expect(series('bcb_sgs:igpm')).toEqual([{ fonte: 'bcb_sgs', serie: 'igpm', data_ref: '2026-09-01', valor: 0.3 }, { fonte: 'bcb_sgs', serie: 'igpm', data_ref: '2026-10-01', valor: 0.45 }])
    expect(series('bcb_olinda:focus_ipca')).toEqual([{ fonte: 'bcb_olinda', serie: 'focus_ipca_2027', data_ref: '2026-10-31', valor: 3.9 }]) // repetida entra uma vez
    expect(series('ibge_sidra:ipca_1737')).toEqual([{ fonte: 'ibge_sidra', serie: 'ipca_mensal', data_ref: '2026-09-01', valor: 0.48 }]) // "..." (NaN) é descartado
    expect(series('worldbank')).toEqual([{ fonte: 'worldbank', serie: 'inflacao_anual', data_ref: '2025-12-31', valor: 4.4 }])
    expect(series('bcb_sgs:ipca')).toEqual([])
  })
})
