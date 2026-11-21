import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent, cleanup } from '@testing-library/react'
import type React from 'react'
import BancadasFilaPage from './BancadasFilaPage'

const pedido = {
  id: 'p1',
  nome_completo: 'Ana Doutora',
  titulo_academico: 'PhD',
  instituicao: 'USP',
  pais: 'Brasil',
  areas_interesse: ['direito'],
  cv_linkedin: null,
  email: 'ana@exemplo.org',
  status: 'pendente',
  criado_em: '2026-11-20T15:00:00Z',
}

const update = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) })
const order = vi.fn()
vi.mock('@/components/Layout', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({ order }),
      update,
    }),
  },
}))

describe('fila das bancadas', () => {
  beforeEach(() => { cleanup(); update.mockClear(); order.mockReset() })

  it('mostra o pedido pendente com os botões de decisão', async () => {
    order.mockResolvedValue({ data: [pedido], error: null })
    render(<BancadasFilaPage />)
    expect(await screen.findByText('Ana Doutora')).toBeTruthy()
    expect(screen.getByText('Aprovar')).toBeTruthy()
    expect(screen.getByText('Recusar')).toBeTruthy()
  })

  it('aprovar grava o status e tira os botões', async () => {
    order.mockResolvedValue({ data: [pedido], error: null })
    render(<BancadasFilaPage />)
    fireEvent.click(await screen.findByText('Aprovar'))
    await waitFor(() => expect(update).toHaveBeenCalledWith({ status: 'aprovado' }))
    expect(screen.getByTestId('status-p1').textContent).toBe('Aprovado')
    expect(screen.queryByText('Aprovar')).toBeNull()
  })

  it('sem a tabela no banco, avisa em vez de quebrar', async () => {
    order.mockResolvedValue({ data: null, error: { message: 'relation does not exist' } })
    render(<BancadasFilaPage />)
    expect((await screen.findByRole('alert')).textContent).toContain('Não consegui ler a fila')
  })
})
