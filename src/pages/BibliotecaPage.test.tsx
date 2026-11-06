// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

let itens: object[] = []
const insert = vi.fn(async (_l: object) => ({ error: null }))
const del = vi.fn(async (_c: string, _v: number) => ({ error: null }))
vi.mock('@/lib/supabase', () => ({
  supabaseConfigurado: true,
  supabase: { from: () => ({ select: () => ({ order: () => ({ limit: async () => ({ data: itens }) }) }), insert: (l: object) => insert(l), delete: () => ({ eq: (c: string, v: number) => del(c, v) }) }) },
}))
vi.mock('@/components/Layout', () => ({ default: ({ title, children }: { title: string; children: React.ReactNode }) => <div><h1>{title}</h1>{children}</div> }))
const { default: BibliotecaPage } = await import('./BibliotecaPage')

describe('Já pesquisado (B04)', () => {
  beforeEach(() => { cleanup(); itens = []; insert.mockClear(); del.mockClear() })
  it('vazia mostra orientação; guardar nota com etiquetas', async () => {
    render(<MemoryRouter><BibliotecaPage /></MemoryRouter>)
    expect(screen.getByTestId('biblioteca-vazia')).toBeTruthy()
    fireEvent.change(screen.getByLabelText('Título da nota'), { target: { value: 'Tese renovatória' } })
    fireEvent.change(screen.getByLabelText('Conteúdo da nota'), { target: { value: 'Prazo de 1 ano a 6 meses.' } })
    fireEvent.change(screen.getByLabelText('Etiquetas'), { target: { value: 'locação, renovatória' } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar nota' }))
    await waitFor(() => expect(screen.getByRole('status').textContent).toBe('Nota guardada.'))
    expect(insert.mock.calls[0][0]).toMatchObject({ tipo: 'nota', etiquetas: ['locação', 'renovatória'] })
  })
  it('busca, filtro por tipo, abrir conteúdo e apagar', async () => {
    itens = [
      { id: 1, tipo: 'assistente', titulo: 'Renovatória', conteudo: 'Resposta completa', etiquetas: ['locação'], caso: null, criado_em: '2026-11-06T10:00:00Z' },
      { id: 2, tipo: 'parte_adversa', titulo: 'Empresa Ré', conteudo: 'Ficha', etiquetas: [], caso: 'Loja 3', criado_em: '2026-11-06T11:00:00Z' },
    ]
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    render(<MemoryRouter><BibliotecaPage /></MemoryRouter>)
    await waitFor(() => expect(screen.getAllByTestId('biblioteca-item').length).toBe(2))
    fireEvent.change(screen.getByLabelText('Procurar na biblioteca'), { target: { value: 'loja' } })
    expect(screen.getAllByTestId('biblioteca-item').length).toBe(1)
    fireEvent.change(screen.getByLabelText('Procurar na biblioteca'), { target: { value: '' } })
    fireEvent.change(screen.getByLabelText('Tipo'), { target: { value: 'assistente' } })
    expect(screen.getAllByTestId('biblioteca-item').length).toBe(1)
    fireEvent.click(screen.getByText('Renovatória'))
    expect(screen.getByTestId('biblioteca-conteudo').textContent).toBe('Resposta completa')
    fireEvent.click(screen.getByLabelText('Apagar Renovatória'))
    await waitFor(() => expect(del).toHaveBeenCalledWith('id', 1))
  })
})
