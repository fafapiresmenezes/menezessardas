// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import BotaoExportar from './BotaoExportar'

function montarPagina(comTabela: boolean) {
  document.body.innerHTML = `<header><h1>Fornecedores</h1></header><main>${comTabela ? '<table><thead><tr><th>Nome</th><th>CNPJ</th></tr></thead><tbody><tr><td>Alfa</td><td>11.111.111/0001-11</td></tr><tr><td>Beta; Ltda</td><td>22.222.222/0001-22</td></tr></tbody></table>' : '<p>Nada</p>'}</main><div id="raiz"></div>`
  return document.getElementById('raiz')!
}

describe('Botão Exportar (CSV ou PDF da tabela da tela)', () => {
  beforeEach(() => { cleanup(); vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers(); document.body.innerHTML = '' })

  it('sem tabela na tela não aparece', async () => {
    const raiz = montarPagina(false)
    render(<MemoryRouter><BotaoExportar /></MemoryRouter>, { container: raiz })
    await act(async () => { vi.advanceTimersByTime(1500) })
    expect(screen.queryByTestId('exportar')).toBeNull()
  })

  it('com tabela: lê linhas após a tela estabilizar, abre o menu, baixa CSV com nome da tela e fecha com Escape', async () => {
    const raiz = montarPagina(true)
    const urls: string[] = []
    URL.createObjectURL = vi.fn(() => 'blob:x') as unknown as typeof URL.createObjectURL
    URL.revokeObjectURL = vi.fn()
    const clique = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) { urls.push(this.download) })
    render(<MemoryRouter><BotaoExportar /></MemoryRouter>, { container: raiz })
    await act(async () => { vi.advanceTimersByTime(1500) })
    const btn = screen.getByTestId('exportar')
    expect(btn.getAttribute('aria-label')).toBe('Exportar a tabela desta tela')
    fireEvent.click(btn)
    const menu = screen.getByTestId('exportar-menu')
    expect(menu.textContent).toContain('2 linha(s)')
    fireEvent.click(screen.getByTestId('exportar-csv'))
    expect(urls[0]).toMatch(/^fornecedores.*\.csv$/)
    expect(screen.queryByTestId('exportar-menu')).toBeNull()
    fireEvent.click(btn)
    expect(screen.getByTestId('exportar-menu')).toBeTruthy()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByTestId('exportar-menu')).toBeNull()
    fireEvent.click(btn)
    fireEvent.click(screen.getByTestId('exportar-pdf'))
    expect(urls[1]).toMatch(/\.pdf$/)
    clique.mockRestore()
  })
})
