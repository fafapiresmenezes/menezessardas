import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { JEN, serieJen, tendencia, previsaoJen, INDICADORES_TRIBUNAL, AREA_JEN } from './mercadoJen'

describe('Justiça em Números no navegador (passo A08)', () => {
  it('a tabela é a mesma da função "mercado" do servidor', () => {
    const fonte = readFileSync('supabase/functions/mercado/index.ts', 'utf8')
    const linha = fonte.split('\n').find(l => l.startsWith('const JEN: '))!
    expect(JSON.parse(linha.slice(linha.indexOf('{')))).toEqual(JEN)
  })
  it('série trabalhista do TRT-1 completa de 2019 a 2025, sem buracos', () => {
    const s = serieJen('TRT1', 0)
    expect(s.map(p => p.ano)).toEqual([2019, 2020, 2021, 2022, 2023, 2024, 2025])
    expect(s.every(p => p.n > 100000)).toBe(true)
  })
  it('tendência linear exata numa reta, com margem zero e R² 1', () => {
    const t = tendencia([{ ano: 2020, n: 100 }, { ano: 2021, n: 200 }, { ano: 2022, n: 300 }, { ano: 2023, n: 400 }], 2026)
    expect(t).toEqual({ prev: 700, margem: 0, r2: 1 })
  })
  it('cada linha do painel por tribunal tem previsão com faixa de 95% e cada área tem indicador', () => {
    for (const l of INDICADORES_TRIBUNAL) {
      const p = previsaoJen(l.trib, l.i)!
      expect(p.ano).toBe(2028)
      expect(p.margem).toBeGreaterThan(0)
      expect(['alta', 'media', 'baixa']).toContain(p.confianca)
    }
    expect(Object.keys(AREA_JEN).length).toBe(10)
    const trt = previsaoJen('TRT1', 0)!
    expect(trt.ultimo).toEqual({ ano: 2025, n: 216901 })
  })
})
