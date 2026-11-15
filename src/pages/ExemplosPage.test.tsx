// @vitest-environment jsdom
// Exemplos de verdade por frente (passo V8): abrem sem senha, são marcados como exemplo e não expõem
// ninguém (nenhum dado de cliente, paciente ou processo real).
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import ExemplosPage from './ExemplosPage'

const montar = () => render(<MemoryRouter><ExemplosPage /></MemoryRouter>)

describe('exemplos de verdade por frente (V8)', () => {
  beforeEach(() => cleanup())

  it('mostra as quatro frentes, cada uma marcada como exemplo', () => {
    montar()
    for (const id of ['direito', 'engenharia', 'saude', 'predicao']) {
      expect(screen.getByTestId(`exemplo-${id}`)).toBeTruthy()
    }
    expect(screen.getAllByTestId('selo-exemplo').length).toBe(4)
  })

  it('cada exemplo diz quando foi e como conferir', () => {
    montar()
    expect(screen.getAllByText(/Como conferir:/).length).toBe(4)
    expect(screen.getAllByText(/Quando:/).length).toBe(4)
  })

  it('o exemplo de direito deixa claro que é rascunho que o advogado assina', () => {
    montar()
    expect(screen.getByText(/revisar e assinar/)).toBeTruthy()
  })

  it('a predição mostra também quando errou', () => {
    montar()
    expect(screen.getByText(/errou/)).toBeTruthy()
  })

  it('volta para a entrada', () => {
    montar()
    expect(screen.getByTestId('exemplos-voltar').getAttribute('href')).toBe('/boas-vindas')
  })
})
