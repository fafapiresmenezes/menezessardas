// Bloco B11: índice diário de notícias jurídicas por tema (GDELT), só agregados.
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { fingirDeno, fingirFetch } from '../_testes/deno'
import { zerar, estado } from '../_testes/supabase-js'

const caixa = fingirDeno({ SUPABASE_URL: 'https://db', SUPABASE_SERVICE_ROLE_KEY: 'k' })
const mod = await import('./index')
const chamar = (segredo: string | null, q = '') => caixa.handler!(new Request(`https://x.functions.supabase.co/gdelt-juridico${q}`, { method: 'POST', headers: segredo ? { 'x-cron-secret': segredo } : {} }))
const hoje = new Date().toISOString().slice(0, 10)
const ontem = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
const compacto = (d: string) => d.replaceAll('-', '')

const respostas: Record<string, () => Response> = {}
beforeEach(() => {
  for (const k of Object.keys(respostas)) delete respostas[k]
  fingirFetch(u => { const k = Object.keys(respostas).find(x => decodeURIComponent(u).includes(x)); return k ? respostas[k]!() : new Response('x', { status: 500 }) })
  zerar({ configuracoes: [{ chave: 'cron_segredo', valor: 'cron-1' }] })
  vi.spyOn(globalThis, 'setTimeout').mockImplementation(((fn: () => void) => { fn(); return 0 }) as unknown as typeof setTimeout)
})

describe('gdelt-juridico', () => {
  it('só o cron com o segredo coleta', async () => {
    expect((await chamar(null)).status).toBe(401)
    expect((await chamar('errado')).status).toBe(401)
  })

  it('a consulta é fixa, em português e restrita ao Brasil; o dia de hoje (incompleto) fica fora', () => {
    const u = mod.urlTema('(despejo OR desocupação)', 3)
    expect(decodeURIComponent(u)).toContain('(despejo OR desocupação) sourcecountry:BR sourcelang:por')
    expect(u).toContain('mode=timelinevol')
    const m = mod.mediasDiarias({ timeline: [{ data: [
      { date: `${compacto(ontem)}T000000Z`, value: 0.2 }, { date: `${compacto(ontem)}T120000Z`, value: 0.4 },
      { date: `${compacto(hoje)}T000000Z`, value: 9 }, { date: 'lixo', value: 1 }, { date: `${compacto(ontem)}T130000Z`, value: Number.NaN },
    ] }] }, hoje)
    expect(m).toEqual([{ data_ref: ontem, valor: 0.3, pontos: 2 }])
    expect(mod.mediasDiarias({}, hoje)).toEqual([])
  })

  it('grava uma coleta por tema com sha256 e as médias diárias como série noticias_<tema>; falha vira lacuna registrada', async () => {
    const ok = () => new Response(JSON.stringify({ timeline: [{ series: 'Volume Intensity', data: [{ date: `${compacto(ontem)}T000000Z`, value: 0.5 }, { date: `${compacto(ontem)}T060000Z`, value: 0.7 }] }] }))
    respostas['locação'] = ok; respostas['despejo'] = ok; respostas['Selic'] = ok; respostas['inadimplência'] = ok; respostas['LGPD'] = ok
    respostas['STF'] = () => new Response('Your query was too short or too long.', { status: 200 })
    const b = await (await chamar('cron-1')).json()
    expect(b.temas).toBe(6)
    expect(b.ok).toBe(5)
    const por = Object.fromEntries((b.resultado as { fonte: string }[]).map(r => [r.fonte, r]))
    expect(por['gdelt:locacao']).toMatchObject({ ok: true, itens: 1 })
    expect(String((por['gdelt:locacao'] as { sha256: string }).sha256)).toMatch(/^[0-9a-f]{64}$/)
    expect(por['gdelt:judiciario']).toMatchObject({ ok: false, itens: 0 })
    expect(String((por['gdelt:judiciario'] as { erro: string }).erro)).toContain('não é JSON')
    const grav = estado.rpcs.filter(r => r.nome === 'instituto_motor_gravar').map(r => r.args as { p_coleta: { fonte: string }; p_series: unknown[] })
    expect(grav).toHaveLength(6)
    expect(grav.find(g => g.p_coleta.fonte === 'gdelt:despejo')!.p_series).toEqual([{ fonte: 'gdelt', serie: 'noticias_despejo', data_ref: ontem, valor: 0.6 }])
    expect(grav.find(g => g.p_coleta.fonte === 'gdelt:judiciario')!.p_series).toEqual([])
    expect(JSON.stringify(grav)).not.toMatch(/https?:\/\/[^"]*(noticia|news)/) // nenhuma URL de notícia é guardada
  })

  it('429 do GDELT é tentado de novo com espera; na terceira falha vira lacuna', async () => {
    const ok = () => new Response(JSON.stringify({ timeline: [{ series: 'Volume Intensity', data: [{ date: `${compacto(ontem)}T000000Z`, value: 0.4 }] }] }))
    let vezes = 0
    respostas['locação'] = () => (++vezes < 3 ? new Response('rate limit', { status: 429 }) : ok())
    respostas['despejo'] = () => new Response('rate limit', { status: 429 })
    respostas['Selic'] = ok; respostas['inadimplência'] = ok; respostas['LGPD'] = ok; respostas['STF'] = ok
    const b = await (await chamar('cron-1')).json()
    const por = Object.fromEntries((b.resultado as { fonte: string }[]).map(r => [r.fonte, r]))
    expect(vezes).toBe(3)
    expect(por['gdelt:locacao']).toMatchObject({ ok: true, itens: 1 })
    expect(por['gdelt:despejo']).toMatchObject({ ok: false, status: 429 })
  })

  it('o parâmetro dias é limitado entre 2 e 30', async () => {
    const urls: string[] = []
    fingirFetch(u => { urls.push(u); return new Response(JSON.stringify({ timeline: [] })) })
    await chamar('cron-1', '?dias=90')
    expect(urls.every(u => u.includes('timespan=30d'))).toBe(true)
  })
})
