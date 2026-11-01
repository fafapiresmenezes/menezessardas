// Passo 550: Edge Function agente-guardiao — resumo dos próximos 30 dias (vencimentos, reajustes, documentos) com passos recomendados e registro em alertas.
import { describe, it, expect, beforeEach } from 'vitest'
import { fingirDeno } from '../_testes/deno'
import { zerar, estado } from '../_testes/supabase-js'

const env: Record<string, string> = { SUPABASE_URL: 'https://db.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'k' }
const caixa = fingirDeno(env)
await import('./index')
const chamar = (method = 'POST') => caixa.handler!(new Request('https://x.functions.supabase.co/agente-guardiao', { method }))
const emDias = (n: number) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10)
const umAnoAtrasMais = (n: number) => { const d = new Date(Date.now() + n * 86400000); d.setFullYear(d.getFullYear() - 1); return d.toISOString().slice(0, 10) }

beforeEach(() => {
  env.SUPABASE_URL = 'https://db.supabase.co'
  zerar({
    contratos: [
      { id: 1, locatario_fornecedor: 'Alfa', data_vencimento: emDias(10), valor_periodico: 3000, encerrado_em: null, data_ultimo_reajuste: null },
      { id: 2, locatario_fornecedor: 'Beta', data_vencimento: emDias(45), valor_periodico: 9999, encerrado_em: null, data_ultimo_reajuste: umAnoAtrasMais(15) },
      { id: 3, locatario_fornecedor: 'Gama', data_vencimento: emDias(5), valor_periodico: 5000, encerrado_em: '2026-01-01', data_ultimo_reajuste: umAnoAtrasMais(2) },
      { id: 4, locatario_fornecedor: 'Delta', data_vencimento: emDias(-3), valor_periodico: 100, encerrado_em: null, data_ultimo_reajuste: umAnoAtrasMais(90) },
    ],
    documentos: [{ id: 7, nome_arquivo: 'seguro.pdf', contrato_id: 1, data_vencimento: emDias(20) }, { id: 8, nome_arquivo: 'velho.pdf', contrato_id: 1, data_vencimento: emDias(-1) }],
    alertas: [],
  })
})

describe('agente-guardiao', () => {
  it('OPTIONS responde com CORS; sem credenciais no ambiente devolve 500', async () => {
    expect((await chamar('OPTIONS')).status).toBe(200)
    env.SUPABASE_URL = ''
    const r = await chamar()
    expect(r.status).toBe(500)
    expect((await r.json()).erro).toBe('Credenciais não disponíveis.')
  })

  it('conta vencimentos ativos na janela, reajustes de aniversário e documentos; soma a receita em risco e grava o resumo em alertas', async () => {
    const r = await chamar()
    expect(r.status).toBe(200)
    const b = await r.json()
    expect(b).toMatchObject({ periodo: '30 dias', vencimentos: 1, reajustes: 1, documentos: 1, receitaEmRisco: 3000 })
    expect(b.data).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(b.proximosPassos).toHaveLength(3)
    expect(b.proximosPassos[0]).toContain('1 contrato(s) vencem')
    expect(b.proximosPassos[1]).toContain('1 reajuste(s)')
    expect(b.proximosPassos[2]).toContain('1 documento(s)')
    expect(estado.inseridos[0]).toMatchObject({ tabela: 'alertas', linha: { tipo: 'resumo_diario', lido: false, dados_json: { vencimentos: 1 } } })
    expect((estado.inseridos[0]!.linha as { descricao: string }).descricao).toContain('1 vencimentos, 1 reajustes, 1 docs')
  })

  it('sem nada programado diz isso em um único passo', async () => {
    estado.tabelas.contratos = []; estado.tabelas.documentos = []
    const b = await (await chamar()).json()
    expect(b).toMatchObject({ vencimentos: 0, reajustes: 0, documentos: 0, receitaEmRisco: 0, proximosPassos: ['Nenhum evento programado nos próximos 30 dias.'] })
  })
})
