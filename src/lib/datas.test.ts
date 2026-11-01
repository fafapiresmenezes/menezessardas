// Passo 410: prazos relativos a hoje — situação, texto e formatação.
import { describe, it, expect } from 'vitest'
import { emDias, diasAte, formatarData, situacaoPorPrazo, textoPrazo } from './datas'

describe('emDias / diasAte', () => {
  it('são inversas: diasAte(emDias(n)) === n', () => {
    for (const n of [-400, -1, 0, 1, 30, 120, 365]) expect(diasAte(emDias(n))).toBe(n)
  })
  it('devolve null para vazio ou data inválida', () => {
    expect(diasAte(null)).toBeNull()
    expect(diasAte('')).toBeNull()
    expect(diasAte('não é data')).toBeNull()
  })
})

describe('formatarData', () => {
  it('converte aaaa-mm-dd em dd/mm/aaaa', () => {
    expect(formatarData('2026-11-02')).toBe('02/11/2026')
  })
  it('devolve travessão para vazio e o texto original quando incompleto', () => {
    expect(formatarData(null)).toBe('—')
    expect(formatarData('2026-11')).toBe('2026-11')
  })
})

describe('situacaoPorPrazo', () => {
  it('classifica pelas faixas 0/30/120 dias e hoje conta como crítico', () => {
    expect(situacaoPorPrazo(null)).toBe('sem_prazo')
    expect(situacaoPorPrazo(-1)).toBe('vencido')
    expect(situacaoPorPrazo(0)).toBe('critico')
    expect(situacaoPorPrazo(30)).toBe('critico')
    expect(situacaoPorPrazo(31)).toBe('atencao')
    expect(situacaoPorPrazo(120)).toBe('atencao')
    expect(situacaoPorPrazo(121)).toBe('regular')
  })
})

describe('textoPrazo', () => {
  it('fala em linguagem corrente, sem números negativos', () => {
    expect(textoPrazo(null)).toBe('Sem prazo definido')
    expect(textoPrazo(-1)).toBe('Vencido há 1 dia')
    expect(textoPrazo(-10)).toBe('Vencido há 10 dias')
    expect(textoPrazo(0)).toBe('Vence hoje')
    expect(textoPrazo(1)).toBe('Vence amanhã')
    expect(textoPrazo(5)).toMatch(/5 dias/)
  })
})
