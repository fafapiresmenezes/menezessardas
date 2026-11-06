// Bloco B09: recalibração semanal só promove modelo que melhora no teste fora da amostra.
import { describe, it, expect, beforeEach } from 'vitest'
import { fingirDeno } from '../_testes/deno'
import { zerar, estado } from '../_testes/supabase-js'

const caixa = fingirDeno({ SUPABASE_URL: 'https://db', SUPABASE_SERVICE_ROLE_KEY: 'k' })
await import('./index')
const chamar = (seg?: string) => caixa.handler!(new Request('https://x/recalibrar', { method: 'POST', headers: seg ? { 'x-cron-secret': seg } : {} }))
const linhas = (n: number, risco: number, taxa: number) => Array.from({ length: n }, (_, i) => ({ tipo: 'risco_contrato', previsto: { risco, renovacao: 50 }, desfecho: { inadimplente: i % Math.round(1 / taxa) === 0 }, desfecho_em: `2026-${String(1 + (i % 9)).padStart(2, '0')}-${String(10 + (i % 18)).padStart(2, '0')}T00:00:${String(i % 60).padStart(2, '0')}Z` }))

beforeEach(() => zerar({ configuracoes: [{ chave: 'cron_segredo', valor: 's3' }], registro_previsoes: [], modelos_calibragem: [] }))

describe('recalibrar (B09)', () => {
  it('recusa sem o segredo do robô', async () => {
    expect((await chamar()).status).toBe(401)
    expect((await chamar('errado')).status).toBe(401)
  })
  it('amostra pequena não treina nada', async () => {
    estado.tabelas.registro_previsoes = linhas(20, 80, 0.1)
    const r = await (await chamar('s3')).json()
    expect(r.resumo[0]).toMatchObject({ alvo: 'inadimplencia', promovido: false })
    expect(r.resumo[0].motivo).toContain('amostra pequena')
    expect(estado.inseridos.length).toBe(0)
  })
  it('previsão exagerada (80% para algo que acontece 10%) é corrigida, promovida e selada com sha256', async () => {
    estado.tabelas.registro_previsoes = linhas(200, 80, 0.1)
    const r = await (await chamar('s3')).json()
    const inad = r.resumo.find((x: { alvo: string }) => x.alvo === 'inadimplencia')
    expect(inad.promovido).toBe(true)
    expect(inad.brier_novo).toBeLessThan(inad.brier_bruto)
    expect(inad.sha256).toMatch(/^[0-9a-f]{64}$/)
    const salvo = estado.inseridos.find(i => i.tabela === 'modelos_calibragem')!.linha as { ativo: boolean; blocos: { valor: number }[] }
    expect(salvo.ativo).toBe(true)
    expect(salvo.blocos[0].valor).toBeCloseTo(0.1, 1)
  })
})
