// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup, act } from '@testing-library/react'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'

let prefs: { area?: string; area_fixa?: string } | null = null
const upsert = vi.fn(async (_r: object) => ({}))
vi.mock('@/lib/supabase', () => ({
  supabaseConfigurado: true,
  supabase: {
    from: () => ({ select: () => ({ maybeSingle: async () => ({ data: prefs }) }), upsert: (r: object) => upsert(r) }),
    auth: { getUser: async () => ({ data: { user: { id: 'u1' } } }) },
  },
}))
const gravarAreaAtual = vi.fn(async (_a: string) => undefined)
vi.mock('@/lib/assistente', () => ({ gravarAreaAtual: (a: string) => gravarAreaAtual(a) }))
vi.mock('@/components/AceiteTermos', () => ({ default: () => null }))
const { default: InicioPage } = await import('./InicioPage')
function Onde() { const l = useLocation(); return <p data-testid="onde">{l.pathname}</p> }
const montar = () => render(<MemoryRouter initialEntries={['/inicio']}><Routes><Route path="/inicio" element={<InicioPage />} /><Route path="*" element={<Onde />} /></Routes></MemoryRouter>)

describe('Tela de entrada por área', () => {
  beforeEach(() => { cleanup(); prefs = null; upsert.mockClear(); gravarAreaAtual.mockClear(); localStorage.clear() })
  afterEach(() => vi.useRealTimers())

  it('mostra as 10 áreas; a busca filtra por título ou descrição e Enter abre a primeira; Imobiliário vai ao painel', async () => {
    montar()
    expect(screen.getAllByTestId(/^area-/).length).toBe(10)
    fireEvent.change(screen.getByTestId('busca-area'), { target: { value: 'INSS' } })
    expect(screen.getByTestId('busca-area-resultado').textContent).toBe('1 área(s); Enter abre Previdenciário.')
    expect(screen.getAllByTestId(/^area-/).length).toBe(1)
    fireEvent.change(screen.getByTestId('busca-area'), { target: { value: 'xyz' } })
    expect(screen.getByTestId('busca-area-resultado').textContent).toContain('Nenhuma área com esse termo')
    fireEvent.change(screen.getByTestId('busca-area'), { target: { value: '' } })
    fireEvent.click(screen.getByTestId('area-imobiliario'))
    expect(screen.getByTestId('onde').textContent).toBe('/dashboard')
    expect(gravarAreaAtual).toHaveBeenCalledWith('imobiliario')
    cleanup(); montar()
    fireEvent.click(screen.getByTestId('ir-meu-dia'))
    expect(screen.getByTestId('onde').textContent).toBe('/meu-dia')
  })

  it('lembra a última área e permite fixá-la como padrão', async () => {
    prefs = { area: 'trabalhista' }
    montar()
    expect((await screen.findByTestId('area-ultima-nome')).textContent).toBe('Trabalhista')
    fireEvent.click(screen.getByTestId('fixar-padrao'))
    await waitFor(() => expect(upsert).toHaveBeenCalledWith(expect.objectContaining({ usuario_id: 'u1', area_fixa: 'trabalhista' })))
    expect(screen.getByTestId('area-fixa-nome').textContent).toBe('Trabalhista')
    fireEvent.click(screen.getByTestId('desfixar'))
    await waitFor(() => expect(upsert).toHaveBeenLastCalledWith(expect.objectContaining({ area_fixa: null })))
    expect(screen.getByTestId('area-ultima-nome')).toBeTruthy()
  })

  it('área fixa entra sozinha após a contagem de 4 s, a não ser que a pessoa escolha outra', async () => {
    prefs = { area_fixa: 'compliance' }
    montar()
    expect((await screen.findByTestId('area-lembrada')).textContent).toContain('entrando em 4 s')
    fireEvent.click(screen.getByTestId('escolher-outra'))
    expect(screen.getByTestId('area-lembrada').textContent).not.toContain('entrando em')
    cleanup(); vi.useFakeTimers()
    montar()
    await act(async () => { await vi.advanceTimersByTimeAsync(10) })
    expect(screen.getByTestId('area-lembrada').textContent).toContain('entrando em 4 s')
    for (let i = 0; i < 5; i++) await act(async () => { await vi.advanceTimersByTimeAsync(1000) })
    await act(async () => { await Promise.resolve() })
    expect(screen.getByTestId('onde').textContent).toBe('/compliance')
    expect(gravarAreaAtual).toHaveBeenCalledWith('compliance')
  })
})
