// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import CiberQuantica, { somarDiasUteis, feriadosNacionais, testeMosca } from './CiberQuantica'

describe('Cibersegurança e quântica (pedido de M, 06/11/2026)', () => {
  it('conta 3 dias úteis sem fim de semana nem feriado nacional', () => {
    expect(somarDiasUteis('2026-11-13', 3)).toBe('2026-11-18') // sexta → quarta (15/11 cai no domingo)
    expect(somarDiasUteis('2026-11-18', 3)).toBe('2026-11-24') // pula 20/11, Consciência Negra
    expect(feriadosNacionais(2026).has('2026-04-03')).toBe(true) // Sexta-feira Santa de 2026
    expect(somarDiasUteis('2026-11-13', 6)).toBe('2026-11-24') // pequeno porte, prazo em dobro
  })
  it('teste de Mosca: risco quando x + y passa de z', () => {
    expect(testeMosca(10, 3, 10)).toEqual({ risco: true, folga: -3 })
    expect(testeMosca(1, 3, 10)).toEqual({ risco: false, folga: 6 })
  })
  it('mostra o prazo da ANPD e o resultado do teste de Mosca na tela', () => {
    render(<MemoryRouter><CiberQuantica /></MemoryRouter>)
    expect(screen.getByTestId('mosca-res').textContent).toMatch(/Em risco/)
    fireEvent.change(screen.getByTestId('ciber-data'), { target: { value: '2026-11-13' } })
    expect(screen.getByTestId('ciber-prazo').textContent).toMatch(/18 de novembro de 2026/)
    fireEvent.change(screen.getByTestId('mosca-x'), { target: { value: '1' } })
    expect(screen.getByTestId('mosca-res').textContent).toMatch(/Fora de risco/)
    expect(screen.getAllByRole('link').some(a => a.getAttribute('href')?.endsWith('/quantico.html'))).toBe(true)
  })
})
