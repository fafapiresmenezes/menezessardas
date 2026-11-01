// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'
import Atalhos, { ATALHOS } from './Atalhos'

const Onde = () => <p data-testid="onde">{useLocation().pathname}</p>
const montar = () => render(
  <MemoryRouter initialEntries={['/dashboard']}>
    <Atalhos />
    <Routes><Route path="*" element={<><Onde /><input aria-label="campo" /></>} /></Routes>
  </MemoryRouter>,
)

describe('Atalhos de teclado', () => {
  beforeEach(cleanup)

  it('"?" abre e fecha a lista com todos os atalhos; Esc também fecha', () => {
    montar()
    expect(screen.queryByTestId('atalhos')).toBeNull()
    fireEvent.keyDown(window, { key: '?' })
    const lista = screen.getByTestId('atalhos')
    for (const a of ATALHOS) expect(lista.textContent).toContain(a.acao)
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.queryByTestId('atalhos')).toBeNull()
  })

  it('"g" seguido de letra vai para a tela; dentro de um campo de texto nada acontece', () => {
    montar()
    fireEvent.keyDown(window, { key: 'g' }); fireEvent.keyDown(window, { key: 'a' })
    expect(screen.getByTestId('onde').textContent).toBe('/agenda')
    const campo = screen.getByLabelText('campo')
    fireEvent.keyDown(campo, { key: 'g' }); fireEvent.keyDown(campo, { key: 's' })
    expect(screen.getByTestId('onde').textContent).toBe('/agenda')
    fireEvent.keyDown(campo, { key: '?' })
    expect(screen.queryByTestId('atalhos')).toBeNull()
  })

  it('"/" dispara Ctrl+K para a busca global', async () => {
    montar()
    const ouvinte = vi.fn((e: KeyboardEvent) => { if (e.ctrlKey && e.key === 'k') ouvinte.mock.calls.length })
    window.addEventListener('keydown', ouvinte)
    fireEvent.keyDown(window, { key: '/' })
    await waitFor(() => expect(ouvinte.mock.calls.some(c => c[0].key === 'k' && c[0].ctrlKey)).toBe(true))
    window.removeEventListener('keydown', ouvinte)
  })
})
