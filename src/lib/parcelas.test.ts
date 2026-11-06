import { describe, it, expect } from 'vitest'
import { planoParcelas, situacaoParcela, resumoParcelas } from './parcelas'

describe('parcelas de honorários (D13)', () => {
  it('divide o total em parcelas mensais e deixa os centavos na última', () => {
    const p = planoParcelas(1000, 3, '2026-01-31')
    expect(p.map(x => x.valor)).toEqual([333.33, 333.33, 333.34])
    expect(p.map(x => x.vencimento)).toEqual(['2026-01-31', '2026-02-28', '2026-03-31'])
    expect(p.reduce((s, x) => s + x.valor, 0)).toBeCloseTo(1000, 2)
  })
  it('vira o ano e recusa entradas inválidas', () => {
    expect(planoParcelas(600, 2, '2026-12-10').map(x => x.vencimento)).toEqual(['2026-12-10', '2027-01-10'])
    expect(planoParcelas(0, 2, '2026-12-10')).toEqual([])
    expect(planoParcelas(100, 0, '2026-12-10')).toEqual([])
    expect(planoParcelas(100, 1, 'x')).toEqual([])
  })
  it('classifica a situação pelo vencimento', () => {
    const hoje = new Date(2026, 10, 6)
    expect(situacaoParcela({ vencimento: '2026-11-01', pago_em: '2026-11-01' }, hoje).codigo).toBe('paga')
    expect(situacaoParcela({ vencimento: '2026-11-01', pago_em: null }, hoje)).toMatchObject({ codigo: 'atrasada', rotulo: 'Atrasada 5 dias', dias: -5 })
    expect(situacaoParcela({ vencimento: '2026-11-06', pago_em: null }, hoje).rotulo).toBe('Vence hoje')
    expect(situacaoParcela({ vencimento: '2026-11-07', pago_em: null }, hoje).rotulo).toBe('Vence em 1 dia')
    expect(situacaoParcela({ vencimento: '2026-12-06', pago_em: null }, hoje).codigo).toBe('em_dia')
  })
  it('resume pagas, abertas e atrasadas com valores', () => {
    const hoje = new Date(2026, 10, 6)
    const r = resumoParcelas([
      { id: 1, caso_id: 'c', numero: 1, vencimento: '2026-10-06', valor: 100, pago_em: '2026-10-06', pagamento_id: 9 },
      { id: 2, caso_id: 'c', numero: 2, vencimento: '2026-11-01', valor: 100.5, pago_em: null, pagamento_id: null },
      { id: 3, caso_id: 'c', numero: 3, vencimento: '2026-12-06', valor: 100, pago_em: null, pagamento_id: null },
    ], hoje)
    expect(r).toEqual({ total: 3, pagas: 1, abertas: 2, atrasadas: 1, valorAberto: 200.5, valorAtrasado: 100.5 })
  })
})
