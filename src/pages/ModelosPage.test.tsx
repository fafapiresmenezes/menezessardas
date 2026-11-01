// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'

let proprios: object[] = []
const insert = vi.fn(async (_r: object): Promise<{ error: { message: string } | null }> => ({ error: null }))
const del = vi.fn(async () => ({}))
vi.mock('@/lib/supabase', () => ({
  supabaseConfigurado: true,
  supabase: { from: (t: string) => t === 'tarefas'
    ? { select: () => ({ eq: () => ({ neq: () => ({ order: () => ({ limit: () => Promise.resolve({ data: [{ id: 'c1', titulo: 'Despejo Rua A', cliente: 'Ana', area: 'Imobiliário', numero_processo: '0001-22', imovel: { endereco: 'Rua A, 10' }, contrato: null }] }) }) }) }) }) }
    : { select: () => ({ order: async () => ({ data: proprios }) }), insert: (r: object) => insert(r), delete: () => ({ eq: async () => { await del(); return {} } }) } },
}))
vi.mock('@/components/Layout', () => ({ default: ({ title, children }: { title: string; children: React.ReactNode }) => <div><h1>{title}</h1>{children}</div> }))
const { default: ModelosPage } = await import('./ModelosPage')

describe('Modelos de peças e contratos', () => {
  beforeEach(() => { cleanup(); proprios = []; insert.mockClear(); del.mockClear(); localStorage.clear(); window.scrollTo = vi.fn() })

  it('catálogo com 16 modelos; busca e filtro por área; abrir leva ao agente da área no modo Redigir com o pedido', async () => {
    Object.defineProperty(window, 'location', { value: { ...window.location, pathname: '/', href: '' }, writable: true })
    render(<ModelosPage />)
    await waitFor(() => expect(screen.getByTestId('contador-modelos').textContent).toContain('16 modelos · 0 do escritório · 16 do catálogo'))
    fireEvent.change(screen.getByTestId('busca-modelo'), { target: { value: 'nda' } })
    expect(screen.getAllByTestId('modelo').length).toBe(1)
    fireEvent.change(screen.getByTestId('busca-modelo'), { target: { value: '' } })
    fireEvent.click(screen.getByRole('button', { name: 'Imobiliário' }))
    expect(screen.getByTestId('contador-modelos').textContent).toContain('7 modelos em Imobiliário')
    expect(localStorage.getItem('lsm-modelos-area')).toBe('Imobiliário')
    fireEvent.click(screen.getByText('Ação renovatória'))
    expect(window.location.href).toContain('?agente=imobiliario&modo=redigir&pedido=Redija%20peti')
    expect(window.location.href).toContain('#/assistente')
  })

  it('escolher um caso mostra a prévia preenchida e abre o modelo com os dados do caso', async () => {
    Object.defineProperty(window, 'location', { value: { ...window.location, pathname: '/', href: '' }, writable: true })
    render(<ModelosPage />)
    const sel = screen.getByTestId('preencher-com-caso')
    await waitFor(() => expect(sel.querySelectorAll('option').length).toBe(2))
    fireEvent.change(sel, { target: { value: 'c1' } })
    const previas = screen.getAllByTestId('previa-preenchida')
    expect(previas.length).toBe(16)
    fireEvent.click(screen.getByText('Contrato de locação comercial'))
    expect(decodeURIComponent(window.location.href)).toContain('Imóvel: Rua A, 10')
  })

  it('cadastra modelo do escritório, duplica um do catálogo com "(cópia)" e apaga o próprio', async () => {
    proprios = [{ id: 'm1', titulo: 'Honorários padrão', area: 'Escritório', agente: 'civel', pedido: 'Redija contrato de honorários entre [escritório] e [cliente].' }]
    render(<ModelosPage />)
    expect((await screen.findByTestId('modelo-proprio')).textContent).toContain('Honorários padrão')
    expect(screen.getByTestId('contador-modelos').textContent).toContain('17 modelos · 1 do escritório')
    fireEvent.click(screen.getByLabelText('Duplicar modelo Acordo de confidencialidade (NDA)'))
    expect((screen.getByLabelText('Título') as HTMLInputElement).value).toBe('Acordo de confidencialidade (NDA) (cópia)')
    expect((screen.getByLabelText('Agente que vai redigir') as HTMLSelectElement).value).toBe('empresarial')
    fireEvent.change(screen.getByLabelText('Título'), { target: { value: 'NDA do escritório' } })
    fireEvent.submit(screen.getByTestId('form-modelo'))
    await waitFor(() => expect(insert).toHaveBeenCalledWith(expect.objectContaining({ titulo: 'NDA do escritório', area: 'Empresarial', agente: 'empresarial' })))
    expect((await screen.findByTestId('msg-modelo')).textContent).toContain('Modelo cadastrado')
    expect(screen.queryByTestId('form-modelo')).toBeNull()
    fireEvent.click(screen.getByLabelText('Apagar modelo Honorários padrão'))
    await waitFor(() => expect(del).toHaveBeenCalled())
  })
})
