// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'

let sede = true
let perfil: string | null = 'operador'
const signOut = vi.fn(async () => ({ error: null }))
vi.mock('@/lib/supabase', () => ({ supabaseConfigurado: true, supabase: { auth: { signOut } } }))
vi.mock('@/lib/equipe', () => ({
  ehSede: async () => sede,
  perfilAtual: async () => perfil,
  listarPessoas: async () => [{ id: '1', funcao: 'admin' }, { id: '2', funcao: null }, { id: '3', funcao: null }],
}))
const aplicarTema = vi.fn()
vi.mock('@/lib/tema', () => ({ temaAtual: () => 'claro', aplicarTema: (t: string) => aplicarTema(t) }))
vi.mock('@/lib/authDemo', () => ({ sairDemo: vi.fn() }))
for (const c of ['Marca', 'BoasVindas', 'TourTela', 'PerguntarTela', 'SinoNotificacoes', 'BotaoExportar', 'Atalhos', 'FaixaConexao', 'ExigirDoisFatores', 'AceiteContratoSaas', 'AceiteTermos']) vi.doMock(`./${c}`, () => ({ default: () => null }))
vi.mock('./ErroTela', () => ({ default: ({ children }: { children: React.ReactNode }) => <>{children}</> }))
vi.mock('./Busca', () => ({ default: ({ aberta, fechar }: { aberta: boolean; fechar: () => void }) => aberta ? <div role="dialog" aria-label="Busca global"><button onClick={fechar}>fechar</button></div> : null }))
const { default: Layout } = await import('./Layout')

function Onde() { const l = useLocation(); return <p data-testid="onde">{l.pathname}</p> }
const montar = (rota = '/dashboard') => render(<MemoryRouter initialEntries={[rota]}><Layout title="Painel"><p>conteúdo</p></Layout><Routes><Route path="*" element={<Onde />} /></Routes></MemoryRouter>)

describe('Moldura das telas (menu, cabeçalho, busca, tema, sair)', () => {
  beforeEach(() => { cleanup(); localStorage.clear(); sede = true; perfil = 'operador'; signOut.mockClear(); aplicarTema.mockClear(); Object.defineProperty(window, 'innerWidth', { value: 1024, configurable: true }) })

  it('começa no menu simples, só com o essencial, e abre o menu completo num clique (e volta)', () => {
    montar('/meu-dia')
    const simples = screen.getByTestId('menu-simples')
    expect([...simples.querySelectorAll('li button')].map(b => b.textContent)).toEqual(['Início', 'O que vence', 'Agenda', 'Meus processos', 'Inserir processos antigos', 'Intimações', 'Meu jeito de escrever', 'Parâmetros de escrita', 'Ver todas as telas'])
    expect([...simples.querySelectorAll('[data-bloco]')].map(b => b.getAttribute('data-bloco'))).toEqual(['Todo dia', 'Processos', 'Escrever peças'])
    expect(simples.querySelector('[aria-current=page]')!.textContent).toBe('O que vence')
    expect(screen.queryByText('Imóveis e locação')).toBeNull()
    fireEvent.click(screen.getByText('Meus processos'))
    expect(screen.getByTestId('onde').textContent).toBe('/processos')
    fireEvent.click(screen.getByTestId('menu-ver-tudo'))
    expect(screen.getByText('Imóveis e locação')).toBeTruthy()
    expect(localStorage.getItem('theye-menu-simples')).toBe('nao')
    fireEvent.click(screen.getByTestId('menu-voltar-simples'))
    expect(screen.getByTestId('menu-simples')).toBeTruthy()
    expect(localStorage.getItem('theye-menu-simples')).toBe('sim')
  })

  it('mostra título e conteúdo, marca o item do menu da tela atual, navega pelo menu e recolhe o menu', () => {
    localStorage.setItem('theye-menu-simples', 'nao')
    montar('/agenda')
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Painel')
    expect(screen.getByText('conteúdo')).toBeTruthy()
    const nav = screen.getByRole('navigation', { name: 'Menu principal' })
    expect(nav.querySelector('[aria-current=page]')!.textContent).toBe('Agenda')
    expect(screen.getByText(/Desenvolvido pelo/).textContent).toContain('THEYE Institute')
    fireEvent.click(screen.getByText('Imóveis e locação'))
    fireEvent.click(screen.getByText('Imóveis'))
    expect(screen.getByTestId('onde').textContent).toBe('/imoveis')
    fireEvent.click(screen.getByLabelText('Recolher menu'))
    expect(screen.queryByText('Agenda')).toBeNull()
    expect(screen.getByLabelText('Expandir menu').getAttribute('aria-expanded')).toBe('false')
    expect(screen.getByTitle('Agenda')).toBeTruthy()
  })

  it('o menu é dividido em grupos: abre o da tela atual e "Hoje", recolhe e abre à vontade, lembra a escolha e mostra a tela escolhida de qualquer grupo', () => {
    localStorage.setItem('theye-menu-simples', 'nao')
    montar('/financeiro')
    const nav = screen.getByRole('navigation', { name: 'Menu principal' })
    const grupo = (nome: string) => screen.getByText(nome).closest('button') as HTMLButtonElement
    expect(grupo('Hoje').getAttribute('aria-expanded')).toBe('true')
    expect(grupo('Clientes e dinheiro').getAttribute('aria-expanded')).toBe('true')
    expect(nav.querySelector('[aria-current=page]')!.textContent).toBe('Financeiro')
    expect(grupo('Imóveis e locação').getAttribute('aria-expanded')).toBe('false')
    expect(screen.queryByText('Fornecedores')).toBeNull()
    fireEvent.click(grupo('Imóveis e locação'))
    expect(screen.getByText('Fornecedores')).toBeTruthy()
    fireEvent.click(grupo('Clientes e dinheiro'))
    expect(screen.queryByText('Funil de vendas')).toBeNull()
    expect(JSON.parse(localStorage.getItem('lsm-menu-grupos')!)).toMatchObject({ imoveis: true, financeiro: false })
    fireEvent.click(screen.getByTestId('menu-alternar-tudo'))
    expect(grupo('Pesquisa e redação').getAttribute('aria-expanded')).toBe('true')
    fireEvent.click(screen.getByTestId('menu-alternar-tudo'))
    expect(grupo('Pesquisa e redação').getAttribute('aria-expanded')).toBe('false')
    expect(grupo('Hoje').getAttribute('aria-expanded')).toBe('true')
    cleanup()
    montar('/financeiro')
    expect(screen.getByText('Funil de vendas')).toBeTruthy()
  })

  it('escritório parceiro não vê os itens só da sede; admin vê a área do administrador com os cadastros pendentes', async () => {
    sede = false
    montar()
    await waitFor(() => expect(screen.queryByText('Imóveis')).toBeNull())
    expect(screen.queryByText('Alertas')).toBeNull()
    expect(screen.getByText('Agenda')).toBeTruthy()
    expect(screen.queryByLabelText(/Área do administrador/)).toBeNull()
    cleanup(); sede = true; perfil = 'admin'
    montar()
    const btn = await screen.findByLabelText('Área do administrador: 2 cadastro(s) esperando liberação')
    fireEvent.click(btn)
    expect(screen.getByTestId('onde').textContent).toBe('/equipe')
  })

  it('Ctrl+K e o botão abrem a busca; o botão de tema aplica o modo escuro; sair encerra a sessão e vai ao login', async () => {
    montar()
    expect(screen.queryByRole('dialog')).toBeNull()
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true })
    expect(screen.getByRole('dialog', { name: 'Busca global' })).toBeTruthy()
    fireEvent.click(screen.getByText('fechar'))
    expect(screen.queryByRole('dialog')).toBeNull()
    fireEvent.click(screen.getByLabelText('Abrir busca global (Ctrl+K)'))
    expect(screen.getByRole('dialog')).toBeTruthy()
    fireEvent.click(screen.getByLabelText('Mais opções'))
    fireEvent.click(screen.getByLabelText('Usar modo escuro'))
    expect(aplicarTema).toHaveBeenCalledWith('escuro')
    fireEvent.click(screen.getByLabelText('Mais opções'))
    expect(screen.getByLabelText('Usar modo claro')).toBeTruthy()
    fireEvent.click(screen.getByText('Sair'))
    await waitFor(() => expect(signOut).toHaveBeenCalled())
    await waitFor(() => expect(screen.getByTestId('onde').textContent).toBe('/login'))
  })
})
