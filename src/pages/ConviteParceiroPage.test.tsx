// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'

let convite: object | null = null
const invoke = vi.fn(async (_n: string, _o: object): Promise<{ data?: { email?: string; erro?: string } | null; error: { message: string } | null }> => ({ data: { email: 'p@parceiro.com' }, error: null }))
const signIn = vi.fn(async (_c: object): Promise<{ error: { message: string } | null }> => ({ error: null }))
vi.mock('@/lib/supabase', () => ({
  supabaseConfigurado: true,
  supabase: { rpc: async () => ({ data: convite }), functions: { invoke: (n: string, o: object) => invoke(n, o) }, auth: { signInWithPassword: (c: object) => signIn(c) } },
}))
vi.mock('@/components/Marca', () => ({ default: () => <div data-testid="marca" /> }))
const { default: ConviteParceiroPage } = await import('./ConviteParceiroPage')
function Onde() { const l = useLocation(); return <p data-testid="onde">{l.pathname}</p> }
const montar = () => render(<MemoryRouter initialEntries={['/convite/tok123']}><Routes><Route path="/convite/:token" element={<ConviteParceiroPage />} /><Route path="*" element={<Onde />} /></Routes></MemoryRouter>)
const base = { nome_escritorio: 'Alfa Advocacia', email: 'p@parceiro.com', funcao: 'operador', aceito: false, expirado: false }

describe('Página pública do convite de escritório parceiro', () => {
  beforeEach(() => { cleanup(); convite = null; invoke.mockClear(); signIn.mockClear() })

  it('convite inexistente, já aceito e expirado mostram cada um o seu aviso', async () => {
    montar()
    expect(screen.getByText('Carregando…')).toBeTruthy()
    expect((await screen.findByRole('alert')).textContent).toContain('Convite não encontrado')
    cleanup(); convite = { ...base, aceito: true }; montar()
    expect((await screen.findByTestId('convite-aceito')).textContent).toContain('já foi aceito')
    fireEvent.click(screen.getByText('Entrar'))
    expect(screen.getByTestId('onde').textContent).toBe('/login')
    cleanup(); convite = { ...base, expirado: true }; montar()
    expect((await screen.findByRole('alert')).textContent).toContain('expirou (vale 14 dias)')
    expect(screen.queryByTestId('convite-aceitar')).toBeNull()
  })

  it('convite válido: botão só com nome e senha de 8+, aceita pela função, entra e vai à entrada por área; erro vira aviso', async () => {
    convite = base
    montar()
    expect((await screen.findByTestId('convite-nome')).textContent).toBe('Alfa Advocacia')
    expect(screen.getByText(/Acesso de/).textContent).toContain('operador')
    const btn = screen.getByTestId('convite-aceitar') as HTMLButtonElement
    expect(btn.disabled).toBe(true)
    fireEvent.change(screen.getByTestId('convite-nome-pessoa'), { target: { value: 'Paula' } })
    fireEvent.change(screen.getByTestId('convite-senha'), { target: { value: 'curta' } })
    expect(btn.disabled).toBe(true)
    fireEvent.change(screen.getByTestId('convite-senha'), { target: { value: 'senhaforte1' } })
    expect(btn.disabled).toBe(false)
    invoke.mockResolvedValueOnce({ data: { erro: 'Convite já usado' }, error: null })
    fireEvent.click(btn)
    expect((await screen.findByTestId('convite-msg')).textContent).toBe('Convite já usado')
    fireEvent.click(btn)
    await waitFor(() => expect(invoke).toHaveBeenLastCalledWith('convidar-parceiro', { body: { aceitar: { token: 'tok123', nome: 'Paula', senha: 'senhaforte1' } } }))
    await waitFor(() => expect(signIn).toHaveBeenCalledWith({ email: 'p@parceiro.com', password: 'senhaforte1' }))
    await waitFor(() => expect(screen.getByTestId('onde').textContent).toBe('/inicio'))
  })
})
