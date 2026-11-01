// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup, within } from '@testing-library/react'
const pessoasNaLista = () => within(document.querySelector('section[aria-labelledby="pessoas"] ul') as HTMLElement).queryAllByRole('listitem')

let perfil: string | null = 'admin'
let pessoas: object[] = []
const definirFuncao = vi.fn(async (_p: object, _f: string | null) => undefined)
const definirSenhaProvisoria = vi.fn(async (_p: object) => 'Abc12345')
vi.mock('@/lib/equipe', async () => {
  const real = await vi.importActual<typeof import('@/lib/equipe')>('@/lib/equipe')
  return { ...real, perfilAtual: async () => perfil, listarPessoas: async () => pessoas, ehSede: async () => false, definirFuncao: (p: object, f: string | null) => definirFuncao(p, f), definirSenhaProvisoria: (p: object) => definirSenhaProvisoria(p) }
})
vi.mock('@/lib/supabase', () => ({ supabaseConfigurado: true, supabase: { rpc: async () => ({ data: [{ usuario_id: 'p1', versao: '1.0', hash: 'abcdef1234567890', aceito_em: '2026-10-20T12:00:00Z' }] }) } }))
vi.mock('@/components/Layout', () => ({ default: ({ title, children }: { title: string; children: React.ReactNode }) => <div><h1>{title}</h1>{children}</div> }))
vi.mock('@/components/TesteGeral', () => ({ default: () => <div data-testid="teste-geral" /> }))
vi.mock('@/components/TesteTelas', () => ({ default: () => <div data-testid="teste-telas" /> }))
vi.mock('@/components/EscritoriosParceiros', () => ({ default: () => null }))
const { default: EquipePage } = await import('./EquipePage')

describe('Área do administrador (equipe)', () => {
  beforeEach(() => { cleanup(); localStorage.clear(); definirFuncao.mockClear(); definirSenhaProvisoria.mockClear(); perfil = 'admin'
    pessoas = [
      { id: 'p1', nome: 'Fátima', email: 'fatima@exemplo.com', funcao: 'admin', confirmado: true, ultimoAcesso: '2026-11-01T10:00:00Z' },
      { id: 'p2', nome: 'Hélio', email: 'helio@exemplo.com', funcao: 'leitor', confirmado: true, ultimoAcesso: null },
      { id: 'p3', nome: 'Nova Pessoa', email: 'nova@exemplo.com', funcao: null, confirmado: false, ultimoAcesso: null },
    ] })

  it('quem não é admin vê só o aviso; admin vê testes, resumo por função, pendentes primeiro e aceite LGPD', async () => {
    perfil = 'leitor'
    render(<EquipePage />)
    await waitFor(() => expect(screen.getByText(/Somente administradores gerenciam a equipe/)).toBeTruthy())
    expect(screen.queryByTestId('teste-geral')).toBeNull()
    cleanup(); perfil = 'admin'
    render(<EquipePage />)
    await waitFor(() => expect(screen.getByText('Pessoas com acesso (3)')).toBeTruthy())
    expect(screen.getByTestId('teste-geral')).toBeTruthy(); expect(screen.getByTestId('teste-telas')).toBeTruthy()
    expect(screen.getByTestId('resumo-funcoes').textContent).toBe('1 esperando liberação1 admin0 operador(es)1 leitor(es)')
    const itens = pessoasNaLista()
    expect(itens[0].textContent).toContain('Nova Pessoa')
    expect(itens[0].textContent).toContain('Aguardando confirmação do e-mail')
    await waitFor(() => expect(screen.getByTestId('aceite-p1').textContent).toContain('Termos e LGPD aceitos em'))
    expect(screen.getByTestId('aceite-p1').textContent).toContain('(v1.0) · hash abcdef123456…')
    expect(screen.getByTestId('aceite-p2').textContent).toContain('ainda não aceitos')
  })

  it('busca e filtro por função são lembrados; mudar a função salva e confirma; erro vira alerta', async () => {
    render(<EquipePage />)
    await waitFor(() => expect(screen.getByText('Pessoas com acesso (3)')).toBeTruthy())
    fireEvent.change(screen.getByTestId('busca-equipe'), { target: { value: 'helio' } })
    expect(pessoasNaLista().length).toBe(1)
    expect(localStorage.getItem('lsm-equipe-busca')).toBe('helio')
    fireEvent.change(screen.getByTestId('busca-equipe'), { target: { value: '' } })
    fireEvent.change(screen.getByTestId('filtro-funcao'), { target: { value: 'pendente' } })
    expect(pessoasNaLista().length).toBe(1)
    expect(localStorage.getItem('lsm-equipe-funcao')).toBe('pendente')
    fireEvent.change(screen.getByLabelText('Função'), { target: { value: 'operador' } })
    await waitFor(() => expect(definirFuncao).toHaveBeenCalledWith(expect.objectContaining({ id: 'p3' }), 'operador'))
    await waitFor(() => expect(screen.getByRole('status').textContent).toContain('Nova Pessoa:'))
    definirFuncao.mockRejectedValueOnce(new Error('Sem permissão'))
    fireEvent.change(screen.getByLabelText('Função'), { target: { value: 'leitor' } })
    await waitFor(() => expect(screen.getByRole('alert').textContent).toBe('Sem permissão'))
  })

  it('senha provisória pede confirmação e mostra a senha uma vez; copiar lista e baixar CSV', async () => {
    window.confirm = vi.fn(() => true)
    const write = vi.fn(async (_t: string) => undefined); Object.assign(navigator, { clipboard: { writeText: write } })
    URL.createObjectURL = vi.fn(() => 'blob:x'); URL.revokeObjectURL = vi.fn()
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined)
    render(<EquipePage />)
    await waitFor(() => expect(screen.getByText('Pessoas com acesso (3)')).toBeTruthy())
    fireEvent.click(screen.getAllByRole('button', { name: 'Senha provisória' })[0])
    await waitFor(() => expect(screen.getByRole('status').textContent).toContain('Senha provisória de Nova Pessoa: Abc12345'))
    expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining('Nova Pessoa'))
    fireEvent.click(screen.getByTestId('copiar-equipe'))
    await waitFor(() => expect(screen.getByTestId('copiar-equipe').textContent).toBe('Lista copiada'))
    expect(write.mock.calls[0][0]).toContain('• Nova Pessoa <nova@exemplo.com> — esperando liberação')
    expect(write.mock.calls[0][0]).toContain('• Fátima <fatima@exemplo.com> — administrador')
    fireEvent.click(screen.getByTestId('baixar-equipe'))
    expect(click).toHaveBeenCalled()
    expect(screen.getByTestId('baixar-equipe').textContent).toBe('baixado')
    click.mockRestore()
  })
})
