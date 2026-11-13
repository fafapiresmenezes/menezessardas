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
  meuEscritorio: async () => ({ nome: 'SARDAS E MENEZES', sede: true, pessoa: 'Ana', email: 'ana@exemplo.com' }),
  esquecerEscritorio: () => undefined,
  listarPessoas: async () => [{ id: '1', funcao: 'admin' }, { id: '2', funcao: null }, { id: '3', funcao: null }],
}))
let alcance = { id: 'u1', cargo: null as string | null, admin: false, veTudo: false }
vi.mock('@/lib/hierarquia', () => ({ meuAlcance: async () => alcance }))
const aplicarTema = vi.fn()
vi.mock('@/lib/tema', () => ({ temaAtual: () => 'claro', aplicarTema: (t: string) => aplicarTema(t) }))
vi.mock('@/lib/authDemo', () => ({ sairDemo: vi.fn() }))
for (const c of ['Marca', 'BoasVindas', 'TourTela', 'PerguntarTela', 'SinoNotificacoes', 'BotaoExportar', 'Atalhos', 'FaixaConexao', 'ExigirDoisFatores', 'AceiteContratoSaas', 'AceiteTermos']) vi.doMock(`./${c}`, () => ({ default: () => null }))
vi.mock('./ErroTela', () => ({ default: ({ children }: { children: React.ReactNode }) => <>{children}</> }))
vi.mock('./AguardandoLiberacao', () => ({ default: () => <div data-testid="aguardando-liberacao" /> }))
vi.mock('./Busca', () => ({ default: ({ aberta, fechar }: { aberta: boolean; fechar: () => void }) => aberta ? <div role="dialog" aria-label="Busca global"><button onClick={fechar}>fechar</button></div> : null }))
const { default: Layout } = await import('./Layout')

function Onde() { const l = useLocation(); return <p data-testid="onde">{l.pathname}</p> }
const montar = (rota = '/dashboard') => render(<MemoryRouter initialEntries={[rota]}><Layout title="Painel"><p>conteúdo</p></Layout><Routes><Route path="*" element={<Onde />} /></Routes></MemoryRouter>)

describe('Moldura das telas (menu, cabeçalho, busca, tema, sair)', () => {
  beforeEach(() => { cleanup(); localStorage.clear(); document.documentElement.removeAttribute('data-letra'); sede = true; perfil = 'operador'; alcance = { id: 'u1', cargo: null, admin: false, veTudo: false }; signOut.mockClear(); aplicarTema.mockClear(); Object.defineProperty(window, 'innerWidth', { value: 1024, configurable: true }) })

  it('o topo de toda tela diz em qual escritório a pessoa está', async () => {
    montar('/meu-dia')
    expect((await screen.findByTestId('escritorio-atual')).textContent).toBe('Escritório: SARDAS E MENEZES')
  })

  it('começa no menu simples, só com o essencial, e abre o menu completo num clique (e volta)', () => {
    montar('/meu-dia')
    const simples = screen.getByTestId('menu-simples')
    expect([...simples.querySelectorAll('li button')].map(b => b.textContent)).toEqual(['Início', 'Meu dia', 'Agenda', 'Intimações', 'Carteira de processos', 'Inserir processos antigos', 'Meu jeito de escrever', 'Parâmetros de escrita', 'Ajustar o meu menu', 'Ver todas as telas'])
    expect([...simples.querySelectorAll('[data-bloco]')].map(b => b.getAttribute('data-bloco'))).toEqual(['Todo dia', 'Processos', 'Escrever peças'])
    expect(simples.querySelector('[aria-current=page]')!.textContent).toBe('Meu dia')
    expect(screen.queryByText('4. Escritório')).toBeNull()
    fireEvent.click(screen.getByText('Carteira de processos'))
    expect(screen.getByTestId('onde').textContent).toBe('/processos')
    fireEvent.click(screen.getByTestId('menu-ver-tudo'))
    expect(screen.getByText('4. Escritório')).toBeTruthy()
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
    fireEvent.click(screen.getByText('2. Processos'))
    fireEvent.click(screen.getByText('Imóveis'))
    expect(screen.getByTestId('onde').textContent).toBe('/imoveis')
    fireEvent.click(screen.getByLabelText('Recolher menu'))
    expect(screen.queryByText('Agenda')).toBeNull()
    expect(screen.getByLabelText('Expandir menu').getAttribute('aria-expanded')).toBe('false')
    // Menu recolhido: a dica do ícone começa pelo nome da tela e explica para que ela serve.
    expect(screen.getByTitle(/^Agenda — /)).toBeTruthy()
  })

  it('o menu é dividido em grupos: abre o da tela atual e "Todo dia", recolhe e abre à vontade, lembra a escolha e mostra a tela escolhida de qualquer grupo', async () => {
    localStorage.setItem('theye-menu-simples', 'nao')
    alcance = { id: 'u1', cargo: 'socio', admin: false, veTudo: true }
    montar('/financeiro')
    const nav = screen.getByRole('navigation', { name: 'Menu principal' })
    const grupo = (nome: string) => screen.getByText(nome).closest('button') as HTMLButtonElement
    await screen.findByText('4. Escritório')
    expect(grupo('1. Todo dia').getAttribute('aria-expanded')).toBe('true')
    expect(grupo('4. Escritório').getAttribute('aria-expanded')).toBe('true')
    expect(nav.querySelector('[aria-current=page]')!.textContent).toContain('Financeiro')
    expect(grupo('2. Processos').getAttribute('aria-expanded')).toBe('false')
    expect(screen.queryByText('Fornecedores')).toBeNull()
    fireEvent.click(grupo('2. Processos'))
    expect(screen.getByText('Fornecedores')).toBeTruthy()
    fireEvent.click(grupo('4. Escritório'))
    expect(screen.queryByText('Funil de vendas')).toBeNull()
    expect(JSON.parse(localStorage.getItem('lsm-menu-grupos')!)).toMatchObject({ processos: true, escritorio: false })
    fireEvent.click(screen.getByTestId('menu-alternar-tudo'))
    expect(grupo('3. Escrever peças').getAttribute('aria-expanded')).toBe('true')
    fireEvent.click(screen.getByTestId('menu-alternar-tudo'))
    expect(grupo('3. Escrever peças').getAttribute('aria-expanded')).toBe('false')
    expect(grupo('1. Todo dia').getAttribute('aria-expanded')).toBe('true')
    cleanup()
    montar('/financeiro')
    expect(await screen.findByText('Funil de vendas')).toBeTruthy()
  })

  it('hierarquia no menu: cada pessoa só vê os grupos do seu nível, e o grupo restrito diz para quem é', async () => {
    localStorage.setItem('theye-menu-simples', 'nao')
    montar('/meu-dia')
    const titulos = () => [...document.querySelectorAll('[data-grupo]')].map(g => g.getAttribute('data-grupo'))
    await waitFor(() => expect(screen.getByTestId('escritorio-atual')).toBeTruthy())
    const blocos = ['hoje', 'processos', 'pecas', 'escritorio', 'conta']
    expect(titulos()).toEqual(blocos)
    expect(screen.queryByText('THEYE Institute')).toBeNull()
    fireEvent.click(screen.getByText('4. Escritório'))
    expect(screen.getByText('Compliance e LGPD')).toBeTruthy()
    expect(screen.queryByText('Financeiro')).toBeNull()
    cleanup(); alcance = { id: 'u1', cargo: 'gestor', admin: false, veTudo: true }
    montar('/meu-dia')
    await waitFor(() => expect(screen.getByTestId('escritorio-atual')).toBeTruthy())
    // o grupo aberto fica lembrado: não precisa clicar de novo
    expect(await screen.findByText('Financeiro')).toBeTruthy()
    expect(titulos()).toEqual(blocos)
    expect(document.querySelector('[data-nivel=gestao]')!.textContent).toBe('sócios e gestor')
    expect(screen.queryByText('Consumo')).toBeNull()
    cleanup(); perfil = 'admin'; alcance = { id: 'u1', cargo: null, admin: true, veTudo: true }
    montar('/meu-dia')
    await waitFor(() => expect(screen.getByTestId('escritorio-atual')).toBeTruthy())
    expect(await screen.findByText('Consumo')).toBeTruthy()
    expect(titulos()).toEqual(blocos)
    expect(document.querySelector('[data-nivel=admin]')!.getAttribute('title')).toContain('Só quem administra o escritório')
  })

  it('meu jeito de trabalhar: o menu simples mostra as telas que a pessoa escolheu, na ordem dela, e a letra maior vale na tela toda', async () => {
    localStorage.setItem('theye-meu-jeito', JSON.stringify({ atalhos: ['/assistente', '/meu-dia', '/financeiro', '/nao-existe'], letra: 'grande' }))
    montar('/meu-dia')
    const simples = screen.getByTestId('menu-simples')
    // /financeiro é de sócios e gestor: quem não é nem vê; tela desconhecida é ignorada.
    expect([...simples.querySelectorAll('li button')].map(b => b.textContent)).toEqual(['Assistente jurídico', 'Meu dia', 'Ajustar o meu menu', 'Ver todas as telas'])
    expect([...simples.querySelectorAll('[data-bloco]')].map(b => b.getAttribute('data-bloco'))).toEqual(['Escrever peças', 'Todo dia'])
    await waitFor(() => expect(document.documentElement.getAttribute('data-letra')).toBe('grande'))
    fireEvent.click(screen.getByTestId('menu-ajustar'))
    expect(screen.getByTestId('onde').textContent).toBe('/meu-jeito')
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

  it('conta que ainda não pertence a um escritório vê só a tela de espera, sem menu nem conteúdo', async () => {
    perfil = null
    montar('/processos')
    await waitFor(() => expect(screen.getByTestId('aguardando-liberacao')).toBeTruthy())
    expect(screen.queryByText('conteúdo')).toBeNull()
    expect(screen.queryByRole('navigation', { name: 'Menu principal' })).toBeNull()
  })
})
