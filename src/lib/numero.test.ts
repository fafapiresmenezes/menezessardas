import { describe, it, expect } from 'vitest'
import { lerNumero, lerHoras } from './numero'
describe('números no formato brasileiro', () => {
  it('lê valores com milhar e vírgula', () => {
    expect(lerNumero('1.234,56')).toBe(1234.56)
    expect(lerNumero('R$ 1.500,00')).toBe(1500)
    expect(lerNumero('1.500')).toBe(1500)
    expect(lerNumero('1234.5')).toBe(1234.5)
    expect(lerNumero('0,5')).toBe(0.5)
    expect(lerNumero('1.000.000')).toBe(1000000)
    expect(lerNumero('-10,5')).toBe(-10.5)
    expect(lerNumero('')).toBeNaN()
    expect(lerNumero('abc')).toBeNaN()
    expect(lerNumero(12)).toBe(12)
  })
  it('lê horas', () => {
    expect(lerHoras('1:30')).toBe(1.5)
    expect(lerHoras('2h15')).toBe(2.25)
    expect(lerHoras('2h')).toBe(2)
    expect(lerHoras('1,5')).toBe(1.5)
    expect(lerHoras('')).toBeNaN()
  })
})
