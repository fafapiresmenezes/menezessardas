// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import ErroTela from './ErroTela'

function Quebra({ msg }: { msg: string | null }) {
  if (msg) throw new Error(msg)
  return <p>Tela ok</p>
}

describe('ErroTela (proteção contra página branca)', () => {
  beforeEach(() => { cleanup(); vi.spyOn(console, 'error').mockImplementation(() => {}) })

  it('mostra explicação simples e detalhe técnico em vez de página branca; Tentar de novo volta ao conteúdo', () => {
    let msg: string | null = 'estado inválido'
    const { rerender } = render(<ErroTela><Quebra msg={msg} /></ErroTela>)
    const alerta = screen.getByTestId('erro-tela')
    expect(alerta.textContent).toContain('Algo inesperado aconteceu nesta tela. Nenhum dado foi perdido.')
    expect(alerta.textContent).toContain('Detalhe técnico: estado inválido')
    msg = null
    rerender(<ErroTela><Quebra msg={msg} /></ErroTela>)
    fireEvent.click(screen.getByText('Tentar de novo'))
    expect(screen.getByText('Tela ok')).toBeTruthy()
  })

  it('erro de rede ganha explicação de internet e o botão recarrega a página', () => {
    const reload = vi.fn()
    Object.defineProperty(window, 'location', { value: { ...window.location, reload }, writable: true })
    render(<ErroTela><Quebra msg="Failed to fetch dynamically imported module" /></ErroTela>)
    expect(screen.getByTestId('erro-tela').textContent).toContain('internet caiu ou ficou lenta')
    fireEvent.click(screen.getByText('Tentar de novo'))
    expect(reload).toHaveBeenCalled()
  })

  it('trocar a chave (outra rota) limpa o erro sozinho', () => {
    const { rerender } = render(<ErroTela chave="/a"><Quebra msg="x" /></ErroTela>)
    expect(screen.getByTestId('erro-tela')).toBeTruthy()
    rerender(<ErroTela chave="/b"><Quebra msg={null} /></ErroTela>)
    expect(screen.getByText('Tela ok')).toBeTruthy()
  })
})
