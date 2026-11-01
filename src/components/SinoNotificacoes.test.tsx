// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'

let lista: object[] = []
const rpc = vi.fn(async () => ({ error: null }))
vi.mock('@/lib/supabase', () => ({
  supabaseConfigurado: true,
  supabase: { rpc, from: () => ({ select: () => ({ order: () => ({ limit: async () => ({ data: lista }) }) }) }) },
}))
const { default: SinoNotificacoes } = await import('./SinoNotificacoes')
const Onde = () => <p data-testid="onde">{useLocation().pathname}</p>
const montar = () => render(<MemoryRouter><SinoNotificacoes /><Routes><Route path="*" element={<Onde />} /></Routes></MemoryRouter>)
const agora = new Date().toISOString()

describe('Sino de notificações', () => {
  beforeEach(() => { cleanup(); rpc.mockClear() })

  it('sem notificações: sino sem contador e painel com explicação', async () => {
    lista = []
    montar()
    const sino = screen.getByTestId('sino')
    await waitFor(() => expect(sino.getAttribute('aria-label')).toBe('Notificações: nenhuma nova'))
    expect(screen.queryByTestId('sino-contador')).toBeNull()
    fireEvent.click(sino)
    expect(screen.getByTestId('sino-painel').textContent).toContain('Nada por aqui.')
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByTestId('sino-painel')).toBeNull()
  })

  it('conta as não lidas, abrir uma marca como lida e navega; marcar todas zera o contador', async () => {
    lista = [
      { id: 1, tipo: 'intimacao', titulo: 'Nova intimação', link: '/intimacoes', criado_em: agora, lida_em: null },
      { id: 2, tipo: 'tarefa', titulo: 'Tarefa para você', link: null, criado_em: agora, lida_em: null },
      { id: 3, tipo: 'fatura', titulo: 'Fatura paga', link: null, criado_em: agora, lida_em: agora },
    ]
    montar()
    expect((await screen.findByTestId('sino-contador')).textContent).toBe('2')
    fireEvent.click(screen.getByTestId('sino'))
    const itens = screen.getAllByTestId('sino-item')
    expect(itens).toHaveLength(3)
    expect(itens[0].textContent).toContain('Intimação · agora')
    fireEvent.click(itens[0])
    await waitFor(() => expect(rpc).toHaveBeenCalledWith('marcar_notificacoes_lidas', { p_ids: [1] }))
    expect(screen.getByTestId('onde').textContent).toBe('/intimacoes')
    expect(screen.getByTestId('sino-contador').textContent).toBe('1')
    fireEvent.click(screen.getByTestId('sino'))
    fireEvent.click(screen.getByText('Marcar todas como lidas'))
    await waitFor(() => expect(rpc).toHaveBeenCalledWith('marcar_notificacoes_lidas', { p_ids: null }))
    expect(screen.queryByTestId('sino-contador')).toBeNull()
  })
})
