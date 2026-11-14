// @vitest-environment jsdom
// Pedido de M (14/11/2026 07h26): a tela que abre depois do login só mostra direito; é preciso
// uma pergunta "qual área você quer entrar" para o Instituto inteiro.
import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import AreasPage from './AreasPage'
import { VERTENTES } from '@/data/vertentes'

vi.mock('@/components/Layout', () => ({
  default: ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div><h1>{title}</h1>{children}</div>
  ),
}))

afterEach(() => cleanup())

describe('tela "qual área você quer entrar"', () => {
  it('lista todas as vertentes, cada uma levando direto à sua própria rota', () => {
    render(<MemoryRouter><AreasPage /></MemoryRouter>)
    for (const v of VERTENTES) {
      const link = screen.getByTestId(`area-${v.id}`)
      expect(link.getAttribute('href')).toBe(v.rota)
    }
  })

  it('cada área mostra o estado (no ar, em teste, em desenvolvimento ou em estudo)', () => {
    render(<MemoryRouter><AreasPage /></MemoryRouter>)
    const lista = screen.getByTestId('lista-areas').textContent ?? ''
    expect(lista).toMatch(/No ar|Em teste|Em desenvolvimento|Em estudo/)
  })
})
