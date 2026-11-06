// @vitest-environment jsdom
// Passos A03/A06 (Régua Global R1): demonstração sem banco e resposta parcial do robô.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

const chamadas: string[] = []
vi.mock('@/lib/supabase', () => ({
  supabaseConfigurado: false,
  supabase: {
    from: () => { chamadas.push('from'); return { select: () => ({ order: () => ({ limit: async () => ({ data: [] }) }) }), update: () => ({ eq: async () => ({}) }) } },
    functions: { invoke: async () => { chamadas.push('invoke'); return { data: null, error: null } } },
    rpc: async () => { chamadas.push('rpc'); return { data: null, error: null } },
  },
}))
vi.mock('@/lib/equipe', () => ({ perfilAtual: async () => 'admin' }))
vi.mock('@/components/Layout', () => ({ default: ({ title, children }: { title: string; children: React.ReactNode }) => <div><h1>{title}</h1>{children}</div> }))
const { default: IntimacoesPage } = await import('./IntimacoesPage')

describe('Intimações na demonstração (sem banco)', () => {
  beforeEach(() => { cleanup(); chamadas.length = 0; localStorage.clear() })

  it('mostra 3 intimações fictícias rotuladas, com urgência, sem chamar o banco nem o CNJ', async () => {
    render(<MemoryRouter><IntimacoesPage /></MemoryRouter>)
    await waitFor(() => expect(screen.getAllByText(/^Processo /).length).toBe(3))
    expect(screen.getAllByText(/dado fictício/).length).toBeGreaterThan(0)
    expect(screen.getByTestId('resumo-urgencia').textContent).toContain('1 vencida(s)')
    fireEvent.click(screen.getByRole('button', { name: /buscar agora/i }))
    await waitFor(() => expect(screen.getByText(/Demonstração: a busca no CNJ/)).toBeTruthy())
    expect(chamadas).not.toContain('invoke')
    expect(chamadas).not.toContain('rpc')
  })

  it('OABs ficam no campo depois de salvas', async () => {
    render(<MemoryRouter><IntimacoesPage /></MemoryRouter>)
    const campo = await screen.findByPlaceholderText(/123456\/RJ/) as HTMLInputElement
    fireEvent.change(campo, { target: { value: '111111/RJ' } })
    fireEvent.click(screen.getByRole('button', { name: /salvar oabs/i }))
    await waitFor(() => expect(screen.getByText(/OABs anotadas \(111111\/RJ\)/)).toBeTruthy())
    expect(campo.value).toBe('111111/RJ')
  })
})
