// Habilidade 1 do replanejamento de mercado (14/11/2026): ICP das 6 famílias do caderno.
import { describe, it, expect } from 'vitest'
import { FAMILIAS } from '@/data/caderno-familias'
import { ICP_FAMILIAS, icpDaFamilia, prioridadeDeProspeccao } from '@/data/icp-familias'

describe('ICP das 6 famílias (habilidade 1 — segmentação e priorização)', () => {
  it('toda família tem um ICP, com fonte preenchida em cada afirmação de mercado', () => {
    expect(ICP_FAMILIAS.length).toBe(FAMILIAS.length)
    for (const f of FAMILIAS) {
      const icp = icpDaFamilia(f.id)
      expect(icp.sinalDeDorAtiva.length, f.nome).toBeGreaterThan(0)
      expect(icp.fonte.length, f.nome).toBeGreaterThan(0)
    }
  })

  it('nenhum sinal de dor ativa é repetido entre famílias (sinal de texto genérico)', () => {
    const sinais = ICP_FAMILIAS.map(i => i.sinalDeDorAtiva)
    expect(new Set(sinais).size).toBe(sinais.length)
  })

  it('a prioridade de prospecção inclui todas as famílias, uma vez cada', () => {
    const ordem = prioridadeDeProspeccao()
    expect(ordem.length).toBe(FAMILIAS.length)
    expect(new Set(ordem).size).toBe(FAMILIAS.length)
  })
})
