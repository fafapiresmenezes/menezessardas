// Habilidade 6 do replanejamento de mercado (14/11/2026): fontes de inteligência de mercado BR.
import { describe, it, expect } from 'vitest'
import { FAMILIAS } from '@/data/caderno-familias'
import { FONTES_POR_FAMILIA, fontesDaFamilia, fontesParaReconferir } from '@/data/inteligencia-mercado'

describe('fontes de inteligência de mercado brasileiro por família (habilidade 6)', () => {
  it('toda família tem ao menos uma fonte com url, o-que-dá e data de conferência', () => {
    for (const f of FAMILIAS) {
      const fontes = fontesDaFamilia(f.id)
      expect(fontes.length, f.nome).toBeGreaterThan(0)
      for (const fonte of fontes) {
        expect(fonte.url, fonte.nome).toMatch(/^https:\/\//)
        expect(fonte.oQueDa.length, fonte.nome).toBeGreaterThan(0)
        expect(fonte.conferidaEm, fonte.nome).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      }
    }
  })

  it('não aponta nenhuma fonte para reconferir quando tudo foi conferido há poucos dias', () => {
    const hoje = new Date('2026-11-14')
    expect(fontesParaReconferir(hoje)).toEqual([])
  })

  it('aponta fonte para reconferir depois do limite de dias sem checagem', () => {
    const hoje = new Date('2027-06-01') // mais de 180 dias depois de 2026-11-14
    const pendentes = fontesParaReconferir(hoje)
    expect(pendentes.length).toBe(
      Object.values(FONTES_POR_FAMILIA).reduce((n, fs) => n + fs.length, 0)
    )
  })
})
