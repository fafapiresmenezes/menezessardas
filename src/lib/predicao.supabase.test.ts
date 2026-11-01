// Passo 533: coleta de previsões para calibragem no modo Supabase — grava em lote, nunca trava a tela.
import { describe, it, expect, vi, beforeEach } from 'vitest'

let configurado = true
let falha = false
const inseridos: unknown[] = []
vi.mock('./supabase', () => ({
  get supabaseConfigurado() { return configurado },
  supabase: { from: (tabela: string) => ({ insert: async (linhas: unknown) => { if (falha) throw new Error('rede'); inseridos.push({ tabela, linhas }); return { error: null } } }) },
}))

const { registrarPrevisoes } = await import('./predicao')

beforeEach(() => { configurado = true; falha = false; inseridos.length = 0 })

describe('registrarPrevisoes', () => {
  it('insere as linhas em registro_previsoes de uma vez', async () => {
    const linhas = [{ tipo: 'renovatoria', referencia: 'c1', previsto: { prob: 0.7 }, amostra: 292, fonte: 'DataJud' }]
    await registrarPrevisoes(linhas)
    expect(inseridos).toEqual([{ tabela: 'registro_previsoes', linhas }])
  })

  it('não grava sem Supabase nem com lista vazia, e engole erro de rede', async () => {
    await registrarPrevisoes([])
    configurado = false
    await registrarPrevisoes([{ tipo: 'x', previsto: 1 }])
    expect(inseridos).toHaveLength(0)
    configurado = true; falha = true
    await expect(registrarPrevisoes([{ tipo: 'x', previsto: 1 }])).resolves.toBeUndefined()
  })
})
