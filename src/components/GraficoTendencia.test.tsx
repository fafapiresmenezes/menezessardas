// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import GraficoTendencia from './GraficoTendencia'
import type { PontoTendencia } from '@/lib/indicadores'

const ponto = (mes: string, rotulo: string, extra: Partial<PontoTendencia> = {}): PontoTendencia =>
  ({ mes, rotulo, contratosVigentes: 3, receitaMensal: 12000, vencimentos: 0, reajustes: 0, documentosAVencer: 0, ...extra })

describe('Gráfico de tendência dos próximos 12 meses', () => {
  beforeEach(cleanup)

  it('é uma imagem com título e descrição acessíveis e repete os números numa tabela', () => {
    render(<GraficoTendencia pontos={[ponto('2026-11', 'nov'), ponto('2026-12', 'dez', { vencimentos: 1, reajustes: 2, documentosAVencer: 3, receitaMensal: 24000 })]} />)
    const svg = screen.getByRole('img')
    expect(svg.getAttribute('aria-labelledby')).toBeTruthy()
    expect(screen.getByText('Tendência dos próximos 12 meses')).toBeTruthy()
    const linhas = screen.getAllByRole('row')
    expect(linhas.length).toBe(3)
    const dez = linhas[2].textContent!.replace(/ /g, ' ')
    expect(dez).toContain('dez')
    expect(dez).toContain('R$ 24.000')
    expect(dez).toContain('123')
    expect(linhas[1].textContent).toContain('———')
    expect(linhas[2].className).toContain('criticoFundo')
    expect(svg.querySelectorAll('circle').length).toBe(1)
    expect(svg.textContent).toContain('3 doc')
    expect(screen.queryByText(/Nenhum vencimento/)).toBeNull()
  })

  it('sem eventos avisa que nada vence; lista vazia não quebra', () => {
    render(<GraficoTendencia pontos={[ponto('2026-11', 'nov')]} compacto />)
    expect(screen.getByText(/Nenhum vencimento, reajuste ou documento/)).toBeTruthy()
    expect(screen.getByRole('img').getAttribute('viewBox')).toBe('0 0 720 150')
    cleanup()
    render(<GraficoTendencia pontos={[]} />)
    expect(screen.getAllByRole('row').length).toBe(1)
  })
})
