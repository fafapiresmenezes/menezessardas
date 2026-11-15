// Habilidade 9 do replanejamento de mercado (14/11/2026): canais de parceria e prospecção.
import { describe, it, expect } from 'vitest'
import { FAMILIAS } from '@/data/caderno-familias'
import { CANAIS, canalSugeridoPorFamilia, canaisDeTodasAsFamilias } from '@/data/canaisDeParceria'

describe('canais de parceria e prospecção (habilidade 9)', () => {
  it('todo canal com comissão exige contrato por escrito, nunca verbal', () => {
    const comComissao = CANAIS.find(c => c.id === 'escritorio-parceiro')!
    expect(comComissao.exigeContrato).toMatch(/por escrito/)
    expect(comComissao.exigeContrato).not.toMatch(/^Nenhum$/)
  })

  it('toda família recebe um canal sugerido, com o porquê explícito (critério documentado)', () => {
    for (const f of FAMILIAS) {
      const { canal, porque } = canalSugeridoPorFamilia(f.id)
      expect(canal).toBeDefined()
      expect(porque.length, f.nome).toBeGreaterThan(0)
      expect(porque, f.nome).toMatch(/ciclo/i)
    }
  })

  it('famílias de ciclo mais longo (bancos, integridade-clima) sugerem escritório parceiro', () => {
    expect(canalSugeridoPorFamilia('bancos').canal.id).toBe('escritorio-parceiro')
    expect(canalSugeridoPorFamilia('integridade-clima').canal.id).toBe('escritorio-parceiro')
  })

  it('canaisDeTodasAsFamilias cobre as 6 famílias, uma vez cada', () => {
    const todos = canaisDeTodasAsFamilias()
    expect(todos.length).toBe(FAMILIAS.length)
    expect(new Set(todos.map(t => t.familia)).size).toBe(FAMILIAS.length)
  })
})
