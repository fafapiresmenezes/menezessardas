// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

// A tranca é do servidor: aqui a função de acesso é fingida para conferir o comportamento da tela.
type Resposta = { data?: unknown; error?: unknown }
const invoke = vi.fn(async (_f: string, _o?: { body?: Record<string, unknown> }): Promise<Resposta> => ({ data: null }))
vi.mock('@/lib/supabase', () => ({
  supabaseConfigurado: true,
  supabase: { functions: { invoke: (f: string, o?: object) => invoke(f, o) } },
}))

const { default: StokasticosPage } = await import('./StokasticosPage')

const erroDoServidor = (erro: string) => ({ error: { context: { json: async () => ({ erro }) } } })
const ACERVO = {
  atualizado_em: '2026-11-13',
  aviso: 'Catálogo de referências.',
  prateleiras: [{ id: 'autores', titulo: 'Por autor', descricao: 'Obras de Peter J. Carroll.', itens: [{ titulo: 'Liber Null', autor: 'Peter J. Carroll', ano: '1987', tipo: 'livro', editora: 'Weiser', assunto: 'magia do caos', nota: '', url: 'https://exemplo.org/liber-null', acesso: 'comprar' }] }],
}

const abrir = (rota = '/stokasticos') => render(<MemoryRouter initialEntries={[rota]}><StokasticosPage /></MemoryRouter>)

describe('Stokasticos trancado', () => {
  beforeEach(() => { cleanup(); invoke.mockReset(); sessionStorage.clear() })

  it('sem senha mostra só o cabeçalho e a entrada; a mensagem de erro do servidor aparece como veio', async () => {
    invoke.mockImplementation(async () => erroDoServidor('Senha não confere.'))
    abrir('/stokasticos/biblioteca')
    expect(screen.getByRole('heading', { name: 'Escola de magia do caos' })).toBeTruthy()
    expect(screen.queryByRole('link', { name: 'Biblioteca' })).toBeNull()
    expect(screen.queryByRole('heading', { name: 'Biblioteca' })).toBeNull()
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'errada' } })
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }))
    await waitFor(() => expect(screen.getByRole('alert').textContent).toBe('Senha não confere.'))
    expect(invoke).toHaveBeenCalledWith('stokasticos-acesso', { body: { acao: 'entrar', senha: 'errada' } })
    expect(sessionStorage.getItem('stokasticos-entrou')).toBeNull()
  })

  it('com a senha certa o acervo vem do servidor e nada do catálogo fica guardado', async () => {
    invoke.mockImplementation(async () => ({ data: { ok: true, acervo: ACERVO } }))
    abrir('/stokasticos/biblioteca')
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'certa' } })
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }))
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Por autor' })).toBeTruthy())
    expect(screen.getByRole('link', { name: 'Liber Null' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Biblioteca' })).toBeTruthy()
    expect(sessionStorage.getItem('stokasticos-entrou')).toBe('1')
    expect(JSON.stringify(sessionStorage)).not.toContain('Liber Null')
  })

  it('sem acervo no servidor a prateleira avisa em vez de quebrar', async () => {
    invoke.mockImplementation(async () => ({ data: { ok: true, acervo: null } }))
    abrir('/stokasticos/biblioteca')
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'certa' } })
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }))
    await waitFor(() => expect(screen.getByText(/Acervo ainda não carregado/)).toBeTruthy())
  })

  it('pedido de acesso: erro do servidor como veio e confirmação calma quando o aviso não sai', async () => {
    invoke.mockImplementation(async (_f, o) => {
      const motivacao = String((o?.body as { motivacao?: string })?.motivacao ?? '')
      return motivacao.length < 20 ? erroDoServidor('Conte em algumas linhas por que quer entrar.') : { data: { ok: true, avisado: false } }
    })
    abrir()
    fireEvent.click(screen.getByRole('button', { name: 'Não tenho senha' }))
    fireEvent.change(screen.getByLabelText('Seu e-mail'), { target: { value: 'pessoa@exemplo.org' } })
    fireEvent.change(screen.getByLabelText('Por que você quer entrar'), { target: { value: 'curto' } })
    fireEvent.click(screen.getByRole('button', { name: 'Pedir acesso' }))
    await waitFor(() => expect(screen.getByRole('alert').textContent).toBe('Conte em algumas linhas por que quer entrar.'))
    fireEvent.change(screen.getByLabelText('Por que você quer entrar'), { target: { value: 'Estudo magia do caos há anos e quero acompanhar as trilhas.' } })
    fireEvent.click(screen.getByRole('button', { name: 'Pedir acesso' }))
    await waitFor(() => expect(screen.getByRole('status').textContent).toContain('A resposta chega pelo e-mail'))
    expect(screen.getByText(/O aviso por e-mail não pôde ser enviado agora/)).toBeTruthy()
    expect(screen.queryByLabelText('Por que você quer entrar')).toBeNull()
  })
})
