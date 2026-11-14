// Habilidade 7 do replanejamento de mercado (14/11/2026): forecasting com faixa de erro.
import { describe, it, expect } from 'vitest'
import { previsaoComFaixa, previsaoComoTexto, type PontoDeSerie } from './forecastingMercado'

describe('forecasting de demanda com faixa de erro (habilidade 7)', () => {
  it('recusa prever com menos de 4 meses de histórico, em vez de inventar uma faixa', () => {
    const serie: PontoDeSerie[] = [
      { quando: '2026-01', valor: 10 },
      { quando: '2026-02', valor: 12 },
    ]
    expect(previsaoComFaixa(serie)).toBeNull()
  })

  it('projeta o próximo mês com faixa acima e abaixo da estimativa central', () => {
    const serie: PontoDeSerie[] = [
      { quando: '2026-01', valor: 10 },
      { quando: '2026-02', valor: 12 },
      { quando: '2026-03', valor: 14 },
      { quando: '2026-04', valor: 16 },
    ]
    const resultado = previsaoComFaixa(serie)!
    expect(resultado.length).toBe(1)
    expect(resultado[0].quando).toBe('2026-05')
    expect(resultado[0].faixaBaixa).toBeLessThanOrEqual(resultado[0].previsto)
    expect(resultado[0].faixaAlta).toBeGreaterThanOrEqual(resultado[0].previsto)
    expect(resultado[0].previsto).toBeCloseTo(18, 0)
  })

  it('projeta vários meses à frente quando o horizonte pede', () => {
    const serie: PontoDeSerie[] = [
      { quando: '2026-01', valor: 10 },
      { quando: '2026-02', valor: 12 },
      { quando: '2026-03', valor: 14 },
      { quando: '2026-04', valor: 16 },
    ]
    const resultado = previsaoComFaixa(serie, 3)!
    expect(resultado.map(r => r.quando)).toEqual(['2026-05', '2026-06', '2026-07'])
  })

  it('o texto da previsão nunca é um número seco: sempre tem faixa', () => {
    const serie: PontoDeSerie[] = [
      { quando: '2026-01', valor: 10 },
      { quando: '2026-02', valor: 12 },
      { quando: '2026-03', valor: 14 },
      { quando: '2026-04', valor: 16 },
    ]
    const texto = previsaoComoTexto(previsaoComFaixa(serie)![0])
    expect(texto).toMatch(/entre .+ e .+/)
  })
})
