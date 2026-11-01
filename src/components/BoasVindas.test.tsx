// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import BoasVindas, { reverBoasVindas } from './BoasVindas'

const montar = () => render(<MemoryRouter><BoasVindas /></MemoryRouter>)

describe('apresentação de boas-vindas', () => {
  beforeEach(() => { cleanup(); localStorage.clear() })

  it('abre na primeira visita e avança pelos quatro passos até Começar', () => {
    montar()
    expect(screen.getByRole('dialog')).toBeTruthy()
    expect(screen.getByText('Boas-vindas à gestão de contratos')).toBeTruthy()
    fireEvent.click(screen.getByText('Próximo'))
    expect(screen.getByText('Cadastre arrastando')).toBeTruthy()
    fireEvent.click(screen.getByText('Voltar'))
    expect(screen.getByText('Boas-vindas à gestão de contratos')).toBeTruthy()
    fireEvent.click(screen.getByText('Próximo')); fireEvent.click(screen.getByText('Próximo')); fireEvent.click(screen.getByText('Próximo'))
    expect(screen.getByLabelText('Passo 4 de 4')).toBeTruthy()
    fireEvent.click(screen.getByText('Começar'))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(localStorage.getItem('lsm-boas-vindas-v1')).toBeTruthy()
  })

  it('não reaparece depois de fechada; Esc fecha; rever apaga a marca', () => {
    localStorage.setItem('lsm-boas-vindas-v1', '2026-11-01T00:00:00Z')
    montar()
    expect(screen.queryByRole('dialog')).toBeNull()
    reverBoasVindas()
    expect(localStorage.getItem('lsm-boas-vindas-v1')).toBeNull()
    cleanup(); montar()
    expect(screen.getByRole('dialog')).toBeTruthy()
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})
