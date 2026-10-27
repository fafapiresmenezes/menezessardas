import { describe, expect, it } from 'vitest'
import { diasAte, emDias, formatarData, situacaoPorPrazo } from '@/lib/datas'

describe('datas', () => {
  it('conta dias a partir de hoje', () => {
    expect(diasAte(emDias(0))).toBe(0)
    expect(diasAte(emDias(7))).toBe(7)
    expect(diasAte(emDias(-3))).toBe(-3)
  })
  it('trata vazio e data inválida', () => {
    expect(diasAte(null)).toBeNull()
    expect(diasAte('nao-e-data')).toBeNull()
  })
  it('formata no padrão brasileiro', () => {
    expect(formatarData('2026-10-27')).toBe('27/10/2026')
    expect(formatarData(null)).toBe('—')
  })
  it('vence hoje é crítico, nunca regular', () => {
    expect(situacaoPorPrazo(0)).toBe('critico')
    expect(situacaoPorPrazo(-1)).toBe('vencido')
    expect(situacaoPorPrazo(null)).toBe('sem_prazo')
    expect(situacaoPorPrazo(365)).toBe('regular')
  })
})
