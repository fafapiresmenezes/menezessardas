// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, act } from '@testing-library/react'
import FaixaConexao from './FaixaConexao'
import { avisarRede } from '@/lib/rede'

const definirOnline = (v: boolean) => Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => v })

describe('FaixaConexao', () => {
  beforeEach(() => { cleanup(); definirOnline(true); avisarRede(true) })
  afterEach(() => { definirOnline(true); avisarRede(true) })

  it('não aparece com rede ok; aparece quando o aparelho fica offline e some quando volta', () => {
    render(<FaixaConexao />)
    expect(screen.queryByTestId('sem-conexao')).toBeNull()
    act(() => { window.dispatchEvent(new Event('offline')) })
    expect(screen.getByRole('alert').textContent).toContain('Sem conexão.')
    act(() => { window.dispatchEvent(new Event('online')) })
    expect(screen.queryByTestId('sem-conexao')).toBeNull()
  })

  it('aparece quando as chamadas falham (avisarRede) mesmo com navigator.onLine, e começa visível se já estava offline', () => {
    render(<FaixaConexao />)
    act(() => { avisarRede(false) })
    expect(screen.getByTestId('sem-conexao')).toBeTruthy()
    act(() => { avisarRede(true) })
    expect(screen.queryByTestId('sem-conexao')).toBeNull()
    cleanup()
    definirOnline(false)
    render(<FaixaConexao />)
    expect(screen.getByTestId('sem-conexao')).toBeTruthy()
  })
})
