// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

vi.mock('@/components/Layout', () => ({ default: ({ children, title }: { children: React.ReactNode; title: string }) => <main><h1>{title}</h1>{children}</main> }))
const { default: NavegadorPage } = await import('./NavegadorPage')
const montar = (rota = '/navegador') => render(<MemoryRouter initialEntries={[rota]}><NavegadorPage /></MemoryRouter>)

describe('Tela do navegador interno', () => {
  beforeEach(() => { cleanup(); localStorage.clear(); vi.restoreAllMocks() })

  it('começa com os atalhos de tribunais, diários e leis', () => {
    montar()
    expect(screen.getByTestId('navegador-inicio')).toBeTruthy()
    expect(screen.getByText('Tribunais')).toBeTruthy()
    expect(screen.getByText('Planalto – Lei do Inquilinato')).toBeTruthy()
  })

  it('endereço digitado abre na janela ao lado, com voltar e histórico', () => {
    const open = vi.spyOn(window, 'open').mockReturnValue({ opener: null, focus: () => undefined } as unknown as Window)
    montar()
    const campo = screen.getByTestId('navegador-endereco') as HTMLInputElement
    fireEvent.change(campo, { target: { value: 'pt.wikipedia.org/wiki/Direito' } })
    fireEvent.submit(campo.closest('form')!)
    expect(open).toHaveBeenLastCalledWith('https://pt.wikipedia.org/wiki/Direito', 'theye-navegador', expect.stringContaining('popup'))
    fireEvent.change(campo, { target: { value: 'https://www.stj.jus.br/' } })
    fireEvent.submit(campo.closest('form')!)
    expect(screen.getByTestId('navegador-janela').textContent).toContain('stj.jus.br')
    fireEvent.click(screen.getByLabelText('Voltar'))
    expect(screen.getByTestId('navegador-janela').textContent).toContain('wikipedia.org')
    expect(JSON.parse(localStorage.getItem('theye-navegador-historico')!)).toHaveLength(2)
  })

  it('termo digitado mostra onde pesquisar', () => {
    montar()
    fireEvent.change(screen.getByTestId('navegador-endereco'), { target: { value: 'despejo' } })
    expect(screen.getByTestId('navegador-buscar-em').textContent).toContain('JusBrasil')
  })

  it('aceita link de outra tela (?u=) sem abrir pop-up sozinho', () => {
    const open = vi.spyOn(window, 'open')
    montar('/navegador?u=https%3A%2F%2Fwww.tjrj.jus.br%2F')
    expect(open).not.toHaveBeenCalled()
    expect(screen.getByTestId('navegador-janela').textContent).toContain('tjrj.jus.br')
  })
})
