// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

const rpc = vi.fn(async () => ({ error: null }))
vi.mock('@/lib/supabase', () => ({
  supabaseConfigurado: true,
  supabase: { rpc, from: () => ({ select: () => ({ maybeSingle: async () => ({ data: { tours_vistos: [] } }) }) }) },
}))
const { default: TourTela } = await import('./TourTela')
const { TOURS } = await import('@/data/tours')
const montar = (rota: string) => render(<MemoryRouter initialEntries={[rota]}><div data-testid="metas-do-mes">Metas</div><TourTela /></MemoryRouter>)

describe('Tour "Como usar esta tela"', () => {
  beforeEach(() => { cleanup(); localStorage.clear(); rpc.mockClear(); Element.prototype.scrollIntoView = vi.fn() })

  it('só aparece em telas com tour; marca "novo" até a pessoa concluir', () => {
    montar('/rota-sem-tour')
    expect(screen.queryByTestId('tour-abrir')).toBeNull()
    cleanup(); montar('/dashboard')
    expect(screen.getByTestId('tour-abrir').getAttribute('aria-label')).toBe('Como usar esta tela: Painel')
    expect(screen.getByTestId('tour-novo')).toBeTruthy()
  })

  it('percorre os passos destacando o elemento da tela e, ao concluir, grava como visto no aparelho e no servidor', async () => {
    montar('/dashboard')
    fireEvent.click(screen.getByTestId('tour-abrir'))
    const passos = TOURS['/dashboard'].passos
    expect(screen.getByTestId('tour-passo-titulo').textContent).toBe(passos[0].titulo)
    expect(screen.getByTestId('tour-dialogo').textContent).toContain(`passo 1 de ${passos.length}`)
    fireEvent.click(screen.getByTestId('tour-proximo'))
    expect(screen.getByTestId('tour-passo-titulo').textContent).toBe(passos[1].titulo)
    expect(screen.getByTestId('metas-do-mes').classList.contains('tour-destaque')).toBe(true)
    fireEvent.click(screen.getByTestId('tour-proximo'))
    fireEvent.click(screen.getByTestId('tour-concluir'))
    expect(screen.queryByTestId('tour-dialogo')).toBeNull()
    expect(screen.queryByTestId('tour-novo')).toBeNull()
    expect(JSON.parse(localStorage.getItem('lsm-tours-vistos') ?? '[]')).toEqual(['/dashboard'])
    await waitFor(() => expect(rpc).toHaveBeenCalledWith('marcar_tour_visto', { p_rota: '/dashboard' }))
    expect(screen.getByTestId('metas-do-mes').classList.contains('tour-destaque')).toBe(false)
  })
})
