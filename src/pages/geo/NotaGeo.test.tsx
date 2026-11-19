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

// --- painel ao vivo (elo R11) -------------------------------------------------------------
describe('o painel diz de onde vem cada nota', () => {
  it('cada dimensão traz o selo da origem do número', () => {
    render(<MemoryRouter><NotaGeo /></MemoryRouter>)
    const doCI = RUBRICA.filter(d => d.fonte === 'ci').length
    const externo = RUBRICA.filter(d => d.fonte === 'externo').length
    expect(screen.getAllByText('medida pela máquina')).toHaveLength(doCI)
    expect(screen.getAllByText('depende de um passo de fora')).toHaveLength(externo)
    expect(screen.getAllByText('medida à mão')).toHaveLength(10 - doCI - externo)
  })

  it('não chama de automáticas as notas escritas à mão', () => {
    render(<MemoryRouter><NotaGeo /></MemoryRouter>)
    expect(screen.getByText(/menos honesto seria chamá-las de automáticas/)).toBeTruthy()
  })

  it('mostra a medição da rodada só nas dimensões que a máquina mede', () => {
    render(<MemoryRouter><NotaGeo /></MemoryRouter>)
    const doCI = RUBRICA.filter(d => d.fonte === 'ci').length
    expect(screen.getAllByText(/Medição desta rodada:/)).toHaveLength(doCI)
  })

  it('a evolução de cada dimensão é alcançável por quem não vê a tela', () => {
    render(<MemoryRouter><NotaGeo /></MemoryRouter>)
    const graficos = screen.getAllByRole('img').filter(g => g.getAttribute('aria-label')?.startsWith('Evolução da nota'))
    expect(graficos.length).toBeGreaterThan(0)
    // o rótulo lê a série inteira em voz alta, elo por elo, com "sem nota" onde não houve nota
    for (const g of graficos) expect(g.getAttribute('aria-label')).toMatch(/Evolução da nota: R1 (\d+|sem nota), R2 /)
  })

  it('dimensão que nunca mudou de nota diz isso em palavras, sem gráfico de enfeite', () => {
    render(<MemoryRouter><NotaGeo /></MemoryRouter>)
    // a dimensão 5 (privacidade) está em 9 desde o primeiro boletim
    expect(screen.getByText(/9\/10 desde o primeiro boletim/)).toBeTruthy()
  })

  it('dimensão sem nota nenhuma avisa que nunca foi medida', () => {
    render(<MemoryRouter><NotaGeo /></MemoryRouter>)
    expect(screen.getByText(/nunca foi medida/)).toBeTruthy()
  })

  it('diz que a evolução foi lida do histórico do código, e por qual script', () => {
    render(<MemoryRouter><NotaGeo /></MemoryRouter>)
    expect(screen.getByText(/historico-nota\.mjs/)).toBeTruthy()
  })
})
