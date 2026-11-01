import { describe, it, expect, vi, beforeEach } from 'vitest'

// Ambiente de teste: sem Supabase (modo demonstração) e com localStorage em memória.
const mem = new Map<string, string>()
;(globalThis as { localStorage?: unknown }).localStorage = {
  getItem: (k: string) => mem.get(k) ?? null,
  setItem: (k: string, v: string) => { mem.set(k, v) },
  removeItem: (k: string) => { mem.delete(k) },
}

const { analisarContrato, ultimaAnalise } = await import('./agente')
type Contrato = import('./repositorio').Contrato
type Imovel = import('./repositorio').Imovel

const imovel = { id: 'i1', endereco: 'Rua A, 10', cidade: 'Rio de Janeiro', uf: 'RJ', tipo: 'comercial' } as unknown as Imovel
const base = {
  id: 'c1', imovelId: 'i1', tipo: 'locacao_comercial', parte: 'Loja X', dataInicio: '2026-01-01',
  dataVencimento: '2027-01-01', valor: 5000, periodicidade: 'mensal', indice: 'igpm', garantia: 'sem_garantia', notas: '',
} as unknown as Contrato

describe('agente de análise em modo demonstração', () => {
  beforeEach(() => { mem.clear(); vi.useFakeTimers() })

  it('devolve análise de exemplo coerente com os dados e marca exemplo=true', async () => {
    const p = analisarContrato(base, imovel)
    await vi.runAllTimersAsync()
    const a = await p
    expect(a.exemplo).toBe(true)
    expect(a.resumo).toContain('Loja X')
    expect(a.clausulasRisco.map(c => c.titulo)).toEqual(['Ausência de garantia', 'Ação renovatória'])
    expect(a.prazos[0]).toEqual({ descricao: 'Vencimento do contrato', data: '01/01/2027' })
    expect(a.sugestoes).toHaveLength(3)
  })

  it('aponta risco médio quando não há reajuste nem prazo', async () => {
    const c = { ...base, indice: 'sem_reajuste', dataVencimento: null, garantia: 'caucao', tipo: 'locacao_residencial' } as unknown as Contrato
    const p = analisarContrato(c, imovel)
    await vi.runAllTimersAsync()
    const a = await p
    expect(a.clausulasRisco).toHaveLength(1)
    expect(a.clausulasRisco[0].gravidade).toBe('media')
    expect(a.prazos).toHaveLength(1)
  })

  it('guarda a última análise localmente e a devolve ao reabrir', async () => {
    expect(await ultimaAnalise('c1')).toBeNull()
    const p = analisarContrato(base, imovel)
    await vi.runAllTimersAsync()
    await p
    const u = await ultimaAnalise('c1')
    expect(u?.exemplo).toBe(true)
    expect(typeof u?.em).toBe('string')
    expect(await ultimaAnalise('outro')).toBeNull()
  })
})
