// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

vi.mock('@/components/Layout', () => ({ default: ({ title, children }: { title: string; children: React.ReactNode }) => <div><h1>{title}</h1>{children}</div> }))
const ReguaPage = (await import('./ReguaPage')).default

afterEach(cleanup)

describe('régua de acerto dos modelos', () => {
  it('diz, sem rodeio, que nenhuma série foi coletada ainda', () => {
    render(<MemoryRouter><ReguaPage /></MemoryRouter>)
    const texto = screen.getByTestId('sem-coleta').textContent!
    expect(texto).toContain('Nenhuma coleta rodou ainda')
    expect(texto).toContain('Não é dado real')
  })

  it('as regras aparecem na tela, não só no código', () => {
    render(<MemoryRouter><ReguaPage /></MemoryRouter>)
    const regras = screen.getByTestId('regras').textContent!
    expect(regras).toContain('fora da amostra')
    expect(regras).toContain('Previsão sem intervalo não sai')
  })

  it('o palpite simples aparece como não aprovado: ele é a régua, não um modelo', () => {
    render(<MemoryRouter><ReguaPage /></MemoryRouter>)
    const texto = document.body.textContent!
    expect(texto).toContain('Palpite simples (amanhã igual a hoje)')
    expect(texto).toContain('Não passou')
  })
})
