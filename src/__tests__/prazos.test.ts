import { describe, it, expect } from 'vitest'
import { calcularPrazo, feriados } from '@/lib/prazos'

describe('prazos processuais', () => {
  it('Páscoa 2026 gera Sexta-feira Santa em 03/04 e Corpus Christi em 04/06', () => {
    const f = feriados(2026)
    expect(f.get('2026-04-03')).toBe('Sexta-feira Santa')
    expect(f.get('2026-06-04')).toBe('Corpus Christi')
  })
  it('15 dias úteis a partir de quinta 05/11/2026 pulam 15/11 (domingo) e 20/11', () => {
    // 06..27/11: úteis excluindo 20/11 (sexta)
    expect(calcularPrazo('2026-11-05', 15).final).toBe('2026-11-27')
  })
  it('recesso forense suspende de 20/12 a 20/01', () => {
    const r = calcularPrazo('2026-12-15', 5)
    expect(r.final).toBe('2027-01-22')
  })
  it('prazo em dobro', () => {
    expect(calcularPrazo('2026-11-05', 5, true).diasContados).toBe(10)
  })
})
