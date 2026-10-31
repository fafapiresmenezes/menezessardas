import { describe, expect, it } from 'vitest'
import { projetarMes, sugerirTeto } from '@/lib/projecaoConsumo'

describe('projeção de consumo', () => {
  it('projeta linearmente pelos dias do mês', () => {
    expect(projetarMes(100, new Date(2026, 9, 10))).toEqual({ projecao: 310, diasDecorridos: 10, diasMes: 31 })
  })
  it('sugere teto com folga de 20%, de 10 em 10, mínimo 50', () => {
    expect(sugerirTeto(310, []).teto).toBe(380)
    expect(sugerirTeto(1, []).teto).toBe(50)
    const r = sugerirTeto(100, [{ mes: '2026-07', brl: 400 }, { mes: '2026-08', brl: 200 }, { mes: '2026-09', brl: 300 }, { mes: '2026-06', brl: 9000 }])
    expect(r.media).toBe(300); expect(r.base).toBe('média dos meses anteriores'); expect(r.teto).toBe(360)
  })
})
