// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'

// Servidor simulado: usuário logado, aceite pendente ou não, RPC de aceite.
let aceiteExistente: { id: string } | null = null
const rpc = vi.fn()
const signOut = vi.fn(async () => undefined)
vi.mock('@/lib/supabase', () => ({
  supabaseConfigurado: true,
  supabase: {
    auth: { getUser: async () => ({ data: { user: { id: 'u1' } } }), signOut },
    from: () => ({ select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: async () => ({ data: aceiteExistente }) }) }) }) }),
    rpc,
  },
}))
vi.mock('@/lib/termos', () => ({ TERMOS_TEXTO: 'Texto dos termos de uso.', TERMOS_VERSAO: '2026-10', hashTermos: async () => 'hash123' }))
const { default: AceiteTermos } = await import('./AceiteTermos')
import Marca from './Marca'

describe('Aceite dos termos no primeiro acesso', () => {
  beforeEach(() => { cleanup(); rpc.mockReset(); aceiteExistente = null })

  it('quem já aceitou esta versão não vê a cobertura', async () => {
    aceiteExistente = { id: 'a1' }
    render(<AceiteTermos />)
    await waitFor(() => expect(screen.queryByTestId('aceite-termos')).toBeNull())
  })

  it('cobre a tela, só libera o botão depois de marcar que leu e grava versão, hash e navegador', async () => {
    rpc.mockResolvedValue({ error: null })
    render(<AceiteTermos />)
    const dialogo = await screen.findByTestId('aceite-termos')
    expect(dialogo.textContent).toContain('Versão 2026-10')
    expect(dialogo.textContent).toContain('Texto dos termos de uso.')
    const botao = screen.getByTestId('aceitar-termos') as HTMLButtonElement
    expect(botao.disabled).toBe(true)
    fireEvent.click(screen.getByTestId('termos-lido'))
    expect(botao.disabled).toBe(false)
    fireEvent.click(botao)
    await waitFor(() => expect(rpc).toHaveBeenCalledWith('aceitar_termos', { p_versao: '2026-10', p_hash: 'hash123', p_navegador: navigator.userAgent }))
    await waitFor(() => expect(screen.queryByTestId('aceite-termos')).toBeNull())
  })

  it('falha ao gravar vira alerta e a cobertura continua; Não aceito sai da conta', async () => {
    rpc.mockResolvedValue({ error: { message: 'sem rede' } })
    render(<AceiteTermos />)
    await screen.findByTestId('aceite-termos')
    fireEvent.click(screen.getByTestId('termos-lido'))
    fireEvent.click(screen.getByTestId('aceitar-termos'))
    expect((await screen.findByRole('alert')).textContent).toContain('Não deu para gravar o aceite: sem rede')
    expect(screen.getByTestId('aceite-termos')).toBeTruthy()
    fireEvent.click(screen.getByText('Não aceito (sair)'))
    expect(signOut).toHaveBeenCalled()
  })
})

describe('Marca (monograma provisório)', () => {
  beforeEach(cleanup)
  it('mostra THEYE Institute com subtítulo e versão grande sem subtítulo', () => {
    const { rerender, container } = render(<Marca />)
    expect(container.textContent).toContain('THEYE Institute')
    expect(container.textContent).toContain('Suporte Jurídico')
    rerender(<Marca tamanho="grande" comSubtitulo={false} />)
    expect(container.textContent).not.toContain('Suporte Jurídico')
    expect(container.innerHTML).toContain('text-4xl')
  })
})
