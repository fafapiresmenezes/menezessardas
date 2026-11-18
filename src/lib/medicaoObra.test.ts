import { describe, it, expect } from 'vitest'
import { calcularBoletim, desvioDeCronograma, semaforo, type ItemContratual } from './medicaoObra'

const itens: ItemContratual[] = [
  { id: 'A', descricao: 'Escavação', unidade: 'm³', quantidade: 1000, precoUnitario: 12.5 },
  { id: 'B', descricao: 'Betão', unidade: 'm³', quantidade: 200, precoUnitario: 300 },
]
const par = { retencao: 0.05, amortizacao: 0.1, adiantamentoPorAmortizar: 100000 }

describe('Boletim de medição de obra', () => {
  it('soma período, acumulado e saldo por item', () => {
    const b = calcularBoletim(itens, [{ itemId: 'A', anterior: 400, periodo: 100 }, { itemId: 'B', anterior: 0, periodo: 50 }], par)
    expect(b.valorContrato).toBe(72500)
    expect(b.valorPeriodo).toBe(16250)
    expect(b.valorAcumulado).toBe(21250)
    expect(b.linhas[0]).toMatchObject({ acumulado: 500, saldo: 500, valorPeriodo: 1250, excedeu: false })
    expect(b.linhas[1]).toMatchObject({ acumulado: 50, saldo: 150, valorAcumulado: 15000 })
  })
  it('calcula retenção, amortização e líquido', () => {
    const b = calcularBoletim(itens, [{ itemId: 'A', anterior: 400, periodo: 100 }, { itemId: 'B', anterior: 0, periodo: 50 }], par)
    expect(b.retencao).toBe(812.5)
    expect(b.amortizacao).toBe(1625)
    expect(b.liquidoAPagar).toBe(13812.5)
  })
  it('a amortização nunca passa do adiantamento que falta', () => {
    const b = calcularBoletim(itens, [{ itemId: 'B', anterior: 0, periodo: 100 }], { ...par, adiantamentoPorAmortizar: 500 })
    expect(b.amortizacao).toBe(500)
    expect(b.liquidoAPagar).toBe(30000 - 1500 - 500)
  })
  it('avisa quando a quantidade medida passa da contratada, e o avanço físico não passa de 100% por item', () => {
    const b = calcularBoletim(itens, [{ itemId: 'A', anterior: 950, periodo: 100 }, { itemId: 'B', anterior: 0, periodo: 0 }], par)
    expect(b.itensExcedidos).toEqual(['A'])
    expect(b.linhas[0].saldo).toBe(-50)
    expect(b.avancoFisico).toBeCloseTo(12500 / 72500, 10)
    expect(b.avancoFinanceiro).toBeGreaterThan(b.avancoFisico)
  })
  it('item sem medição entra zerado; contrato vazio não divide por zero', () => {
    expect(calcularBoletim(itens, [], par).valorPeriodo).toBe(0)
    const vazio = calcularBoletim([], [], par)
    expect(vazio.avancoFisico).toBe(0)
    expect(vazio.avancoFinanceiro).toBe(0)
  })
  it('não acumula erro de vírgula', () => {
    const b = calcularBoletim([{ id: 'C', descricao: 'x', unidade: 'un', quantidade: 3, precoUnitario: 0.1 }], [{ itemId: 'C', anterior: 0, periodo: 3 }], { retencao: 0, amortizacao: 0, adiantamentoPorAmortizar: 0 })
    expect(b.valorPeriodo).toBe(0.3)
  })
  it('recusa quantidade negativa e percentagem fora de 0 a 1', () => {
    expect(() => calcularBoletim(itens, [{ itemId: 'A', anterior: 0, periodo: -1 }], par)).toThrow(/inválida/)
    expect(() => calcularBoletim(itens, [], { ...par, retencao: 1.2 })).toThrow(/Retenção/)
  })
})

describe('Painel: desvio e semáforo', () => {
  it('desvio em pontos percentuais, negativo quando atrasado', () => {
    expect(desvioDeCronograma(0.42, 0.5)).toBe(-8)
    expect(desvioDeCronograma(0.5, 0.5)).toBe(0)
  })
  it('semáforo pelo pior dos dois sinais', () => {
    expect(semaforo(0, 0)).toBe('verde')
    expect(semaforo(-5, 0)).toBe('amarelo')
    expect(semaforo(0, 9)).toBe('amarelo')
    expect(semaforo(-12, 0)).toBe('vermelho')
    expect(semaforo(2, 15)).toBe('vermelho')
  })
})
