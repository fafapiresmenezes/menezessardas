// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'

// Banco simulado: tabelas imoveis e imovel_acesso respondem o que o teste mandar.
let perfil = 'admin'
let restrito = false
let acessos: { usuario_id: string }[] = []
const update = vi.fn(async () => ({ error: null }))
const insert = vi.fn(async () => ({ error: null }))
const del = vi.fn(async () => ({ error: null }))
const from = (tabela: string) => tabela === 'imoveis'
  ? { select: () => ({ eq: () => ({ single: async () => ({ data: { restrito } }) }) }), update: () => ({ eq: update }) }
  : { select: () => ({ eq: async () => ({ data: acessos }) }), insert, delete: () => ({ eq: () => ({ eq: del }) }) }
vi.mock('@/lib/supabase', () => ({ supabaseConfigurado: true, supabase: { from } }))
vi.mock('@/lib/equipe', () => ({
  perfilAtual: async () => perfil,
  listarPessoas: async () => [
    { id: 'u1', nome: 'Letícia', email: 'l@x', funcao: 'advogada' },
    { id: 'u2', nome: '', email: 'helio@x', funcao: 'leitor' },
    { id: 'u3', nome: 'Fátima', email: 'f@x', funcao: 'admin' },
  ],
}))
const { default: AcessoRestrito } = await import('./AcessoRestrito')

describe('Sigilo por imóvel', () => {
  beforeEach(() => { cleanup(); perfil = 'admin'; restrito = false; acessos = []; update.mockClear(); insert.mockClear(); del.mockClear() })

  it('só o administrador vê a seção', async () => {
    perfil = 'advogada'
    const { container } = render(<AcessoRestrito imovelId="i1" />)
    await new Promise(r => setTimeout(r, 10))
    expect(container.innerHTML).toBe('')
  })

  it('marcar restrito grava no banco e lista a equipe (sem os administradores) para escolher quem vê', async () => {
    render(<AcessoRestrito imovelId="i1" />)
    const caixa = await screen.findByTestId('restrito') as HTMLInputElement
    expect(caixa.checked).toBe(false)
    fireEvent.click(caixa)
    await waitFor(() => expect(update).toHaveBeenCalledWith('id', 'i1'))
    expect((await screen.findByRole('status')).textContent).toContain('Imóvel restrito')
    expect(screen.getByText('Letícia')).toBeTruthy()
    expect(screen.getByText('helio@x')).toBeTruthy()
    expect(screen.queryByText('Fátima')).toBeNull()
    fireEvent.click(screen.getByLabelText('Letícia'))
    await waitFor(() => expect(insert).toHaveBeenCalledWith({ imovel_id: 'i1', usuario_id: 'u1' }))
  })

  it('imóvel já restrito mostra quem está marcado e desmarcar apaga o acesso', async () => {
    restrito = true; acessos = [{ usuario_id: 'u1' }]
    render(<AcessoRestrito imovelId="i1" />)
    const leticia = await screen.findByLabelText('Letícia') as HTMLInputElement
    expect(leticia.checked).toBe(true)
    expect((screen.getByLabelText('helio@x') as HTMLInputElement).checked).toBe(false)
    fireEvent.click(leticia)
    await waitFor(() => expect(del).toHaveBeenCalledWith('usuario_id', 'u1'))
  })
})
