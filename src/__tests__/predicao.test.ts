import { describe, it, expect } from 'vitest'
import { intervaloWilson, preverContrato } from '@/lib/predicao'
import type { Contrato } from '@/lib/repositorio'

const base: Contrato = {
  id: 'c1', imovelId: 'i1', tipo: 'locacao_comercial', parte: 'X', dataInicio: '2021-01-01', dataVencimento: '2026-01-01',
  valor: 10000, periodicidade: 'mensal', indice: 'igpm', garantia: 'seguro_fianca', dataUltimoReajuste: null, notas: '', criadoEm: '2021-01-01', documentos: [],
}

describe('predição', () => {
  it('Wilson: amostra pequena dá intervalo largo, grande dá estreito', () => {
    const pequeno = intervaloWilson(7, 10)!
    const grande = intervaloWilson(700, 1000)!
    expect(pequeno.max - pequeno.min).toBeGreaterThan(40)
    expect(grande.max - grande.min).toBeLessThan(7)
    expect(intervaloWilson(0, 0)).toBeNull()
  })
  it('sem garantia e vencido pesa mais que seguro-fiança em dia', () => {
    const seguro = preverContrato({ ...base, dataVencimento: '2099-01-01', dataUltimoReajuste: new Date().toISOString().slice(0, 10) }, undefined, null)
    const ruim = preverContrato({ ...base, garantia: 'sem_garantia' }, undefined, null)
    expect(ruim.risco).toBeGreaterThan(seguro.risco)
    expect(ruim.faixaRisco).toBe('alto')
    expect(seguro.renovacao).toBeGreaterThan(ruim.renovacao)
  })
})
