// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import GuiaDaTela from './GuiaDaTela'
import { GUIAS, chaveGuia } from '@/lib/guias'

describe('GuiaDaTela', () => {
  beforeEach(() => { cleanup(); localStorage.clear() })

  it('abre sozinho na primeira visita, com os passos numerados da tela', () => {
    render(<GuiaDaTela caminho="/equipe" />)
    const guia = screen.getByTestId('guia-da-tela')
    expect(guia.textContent).toContain(GUIAS['/equipe'].titulo)
    expect(guia.querySelectorAll('ol > li')).toHaveLength(GUIAS['/equipe'].passos.length)
  })

  it('"Entendi" fecha, lembra a escolha e deixa o botão para ver de novo', () => {
    const { unmount } = render(<GuiaDaTela caminho="/prazos" />)
    fireEvent.click(screen.getByTestId('guia-entendi'))
    expect(screen.queryByTestId('guia-da-tela')).toBeNull()
    expect(localStorage.getItem(chaveGuia('/prazos'))).toBe('1')
    unmount()

    render(<GuiaDaTela caminho="/prazos" />)
    expect(screen.queryByTestId('guia-da-tela')).toBeNull()
    fireEvent.click(screen.getByTestId('guia-abrir'))
    expect(screen.queryByTestId('guia-da-tela')).not.toBeNull()
  })

  it('o que foi visto em uma tela não esconde o guia de outra', () => {
    localStorage.setItem(chaveGuia('/prazos'), '1')
    render(<GuiaDaTela caminho="/agenda" />)
    expect(screen.queryByTestId('guia-da-tela')).not.toBeNull()
  })

  it('não mostra nada em tela sem guia', () => {
    const { container } = render(<GuiaDaTela caminho="/tela-que-nao-existe" />)
    expect(container.innerHTML).toBe('')
  })

  it('todo guia é curto e sem passos repetidos', () => {
    for (const [caminho, guia] of Object.entries(GUIAS)) {
      expect(guia.passos.length, caminho).toBeGreaterThanOrEqual(3)
      expect(guia.passos.length, caminho).toBeLessThanOrEqual(5)
      expect(new Set(guia.passos).size, caminho).toBe(guia.passos.length)
    }
  })
})
