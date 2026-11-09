// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'

const invoke = vi.fn()
vi.mock('@/lib/supabase', () => ({ supabaseConfigurado: false, supabase: { functions: { invoke } } }))
vi.mock('@/components/Layout', () => ({ default: ({ title, children }: { title: string; children: React.ReactNode }) => <div><h1>{title}</h1>{children}</div> }))
vi.mock('@/components/ComparacaoJustica', () => ({ default: () => <div data-testid="comparacao" /> }))
const { default: MercadoPage } = await import('./MercadoPage')

describe('Mercado jurídico na demonstração (passo A08)', () => {
  it('sem servidor, as 10 áreas usam a série pública do CNJ, com aviso e sem rede', () => {
    render(<MercadoPage />)
    expect(screen.getByTestId('aviso-demo-mercado').textContent).toContain('Justiça em Números 2026')
    expect(invoke).not.toHaveBeenCalled()
    expect(screen.queryAllByText('Consultando o CNJ…').length).toBe(0)
    const trab = screen.getByTestId('mercado-trabalhista')
    expect(trab.textContent).toContain('Trabalhista (TRT-1)')
    expect(trab.textContent).toContain('Último ano: 216.901')
    expect(screen.getByTestId('fonte-unica-trabalhista').textContent).toContain('TRT1')
  })
  it('painel por tribunal mostra a faixa de 95% e baixa a planilha', () => {
    URL.createObjectURL = vi.fn(() => 'blob:x'); URL.revokeObjectURL = vi.fn()
    const clique = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined)
    render(<MercadoPage />)
    const painel = screen.getAllByTestId('intervalo-tribunais')[0]
    expect(within(painel).getAllByRole('row').length).toBe(10)
    expect(within(painel).getByTestId('tribunal-TRT1-0').textContent).toMatch(/TRT-1Trabalhista, 1º grau216\.901 \(2025\).* a /)
    fireEvent.click(within(painel).getByTestId('baixar-tribunais'))
    expect(clique).toHaveBeenCalled()
    expect(within(painel).getByTestId('baixar-tribunais').textContent).toBe('Baixado')
    clique.mockRestore()
  })
  it('Imprimir, imprimir ranking e Copiar link funcionam na demonstração', async () => {
    const imprimir = vi.spyOn(window, 'print').mockImplementation(() => undefined)
    const write = vi.fn(async () => undefined); Object.assign(navigator, { clipboard: { writeText: write } })
    render(<MercadoPage />)
    fireEvent.click(screen.getAllByTestId('imprimir-mercado')[0])
    fireEvent.click(screen.getAllByTestId('imprimir-ranking')[0])
    expect(imprimir).toHaveBeenCalledTimes(2)
    fireEvent.click(screen.getAllByTestId('copiar-link-mercado')[0])
    await vi.waitFor(() => expect(screen.getAllByTestId('copiar-link-mercado')[0].textContent).toBe('Link copiado'))
    expect(write).toHaveBeenCalledWith(window.location.href)
    imprimir.mockRestore()
  })
})
