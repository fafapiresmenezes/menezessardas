import { render, screen, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, afterEach } from 'vitest'
import NotaGeo from './NotaGeo'
import { RUBRICA } from '@/data/geo/nota'

afterEach(cleanup)

describe('Régua de nota do geo', () => {
  it('mostra as 10 dimensões da rubrica', () => {
    render(<MemoryRouter><NotaGeo /></MemoryRouter>)
    expect(RUBRICA).toHaveLength(10)
    for (const d of RUBRICA) {
      expect(screen.getByText(`${d.n}. ${d.nome}`), d.nome).toBeTruthy()
    }
  })

  it('mostra uma etiqueta de nota por dimensão', () => {
    render(<MemoryRouter><NotaGeo /></MemoryRouter>)
    expect(screen.getAllByTestId('nota-badge').length).toBe(10)
  })

  it('marca como "a medir" as dimensões ainda não medidas', () => {
    render(<MemoryRouter><NotaGeo /></MemoryRouter>)
    const aMedir = RUBRICA.filter(d => d.nota == null).length
    const etiquetas = screen.getAllByTestId('nota-badge').filter(e => e.textContent === 'a medir')
    expect(etiquetas.length).toBe(aMedir)
  })
})
