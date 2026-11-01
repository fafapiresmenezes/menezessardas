// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'

const rpc = vi.fn()
let perfil = 'admin'
vi.mock('@/lib/supabase', () => ({ supabaseConfigurado: true, supabase: { rpc } }))
vi.mock('@/lib/equipe', () => ({ perfilAtual: async () => perfil }))
const { default: SecaoPix } = await import('./SecaoPix')

describe('Configurações → Cobrança por PIX', () => {
  beforeEach(() => { cleanup(); rpc.mockReset(); perfil = 'admin' })

  it('só o administrador vê a seção', async () => {
    perfil = 'leitor'
    rpc.mockResolvedValue({ data: null, error: null })
    render(<SecaoPix />)
    await waitFor(() => expect(rpc).toHaveBeenCalledWith('dados_pix'))
    expect(screen.queryByTestId('secao-pix')).toBeNull()
  })

  it('mostra a chave atual, salva pela RPC e confirma', async () => {
    rpc.mockImplementation(async (nome: string) => nome === 'dados_pix'
      ? { data: [{ pix_chave: '10945994000172', pix_nome: 'GMenezes', pix_cidade: 'Rio de Janeiro' }], error: null }
      : { data: null, error: null })
    render(<SecaoPix />)
    const secao = await screen.findByTestId('secao-pix')
    expect(secao.textContent).toContain('Chave atual: 10945994000172')
    fireEvent.change(screen.getByTestId('pix-chave'), { target: { value: 'contato@gmenezes.com' } })
    fireEvent.click(screen.getByTestId('salvar-pix'))
    await waitFor(() => expect(rpc).toHaveBeenCalledWith('definir_pix', { p_chave: 'contato@gmenezes.com', p_nome: 'GMenezes', p_cidade: 'Rio de Janeiro' }))
    expect((await screen.findByRole('status')).textContent).toContain('Chave PIX salva')
  })

  it('sem chave o botão fica desabilitado; erro do servidor vira alerta', async () => {
    rpc.mockImplementation(async (nome: string) => nome === 'dados_pix' ? { data: [{ pix_chave: null }], error: null } : { data: null, error: { message: 'Só administradores' } })
    render(<SecaoPix />)
    const botao = await screen.findByTestId('salvar-pix') as HTMLButtonElement
    expect(botao.disabled).toBe(true)
    expect(screen.getByTestId('secao-pix').textContent).toContain('Nenhuma chave ainda.')
    fireEvent.change(screen.getByTestId('pix-chave'), { target: { value: 'x' } })
    fireEvent.click(botao)
    expect((await screen.findByRole('alert')).textContent).toContain('Só administradores')
  })
})
