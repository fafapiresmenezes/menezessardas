// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup, act } from '@testing-library/react'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'

let prefs: { area?: string; area_fixa?: string } | null = null
const upsert = vi.fn(async (_r: object) => ({}))
vi.mock('@/lib/supabase', () => ({
  supabaseConfigurado: true,
  supabase: {
    from: () => ({ select: () => ({ maybeSingle: async () => ({ data: prefs }) }), upsert: (r: object) => upsert(r) }),
    auth: { getUser: async () => ({ data: { user: { id: 'u1' } } }), signOut: () => signOut() },
  },
}))
const signOut = vi.fn(async () => ({}))
type Esc = { nome: string; sede: boolean; pessoa: string; email: string; instituto?: boolean; advocacia?: string }
let escritorio: Esc | null = null
const esquecerEscritorio = vi.fn()
vi.mock('@/lib/equipe', () => ({ meuEscritorio: async () => escritorio, esquecerEscritorio: () => esquecerEscritorio() }))
let alcance: { id: string; cargo: string | null; admin: boolean; veTudo: boolean } | null = null
vi.mock('@/lib/hierarquia', async original => ({
  ...(await original<typeof import('@/lib/hierarquia')>()),
  meuAlcance: async () => { if (!alcance) throw new Error('sem alcance'); return alcance },
}))
vi.mock('@/lib/preferencias', () => ({ minhaPreferencia: async () => ({ telaInicial: '' }), telaPorCargo: () => '/meu-dia' }))
const gravarAreaAtual = vi.fn(async (_a: string) => undefined)
vi.mock('@/lib/assistente', async original => ({ ...(await original<typeof import('@/lib/assistente')>()), gravarAreaAtual: (a: string) => gravarAreaAtual(a) }))
vi.mock('@/components/AceiteTermos', () => ({ default: () => null }))
const { default: InicioPage } = await import('./InicioPage')
function Onde() { const l = useLocation(); return <p data-testid="onde">{l.pathname}</p> }
const montar = () => render(<MemoryRouter initialEntries={['/inicio']}><Routes><Route path="/inicio" element={<InicioPage />} /><Route path="*" element={<Onde />} /></Routes></MemoryRouter>)

describe('Tela de entrada por área', () => {
  beforeEach(() => { cleanup(); prefs = null; escritorio = null; alcance = null; upsert.mockClear(); gravarAreaAtual.mockClear(); signOut.mockClear(); esquecerEscritorio.mockClear(); localStorage.clear(); sessionStorage.clear() })
  afterEach(() => vi.useRealTimers())

  it('mostra todas as matérias do direito; a busca filtra por título ou descrição e Enter abre a primeira; Imobiliário vai ao painel', async () => {
    montar()
    expect(screen.getAllByTestId(/^area-/).length).toBe(44)
    for (const m of ['constitucional', 'administrativo', 'processo_civil', 'eleitoral', 'digital', 'ambiental', 'condominial', 'recuperacao']) expect(screen.getByTestId(`area-${m}`)).toBeTruthy()
    expect(screen.getByTestId('todas-areas').textContent).toContain('Ver todas as 44 matérias do direito')
    fireEvent.change(screen.getByTestId('busca-area'), { target: { value: 'INSS' } })
    expect(screen.getByTestId('busca-area-resultado').textContent).toBe('1 área(s); Enter abre Previdenciário.')
    expect(screen.getAllByTestId(/^area-/).length).toBe(1)
    fireEvent.change(screen.getByTestId('busca-area'), { target: { value: 'xyz' } })
    expect(screen.getByTestId('busca-area-resultado').textContent).toContain('Nenhuma área com esse termo')
    fireEvent.change(screen.getByTestId('busca-area'), { target: { value: '' } })
    fireEvent.click(screen.getByTestId('area-imobiliario'))
    expect(screen.getByTestId('onde').textContent).toBe('/dashboard')
    expect(gravarAreaAtual).toHaveBeenCalledWith('imobiliario')
    cleanup(); montar()
    fireEvent.click(screen.getByTestId('ir-meu-dia'))
    expect(screen.getByTestId('onde').textContent).toBe('/meu-dia')
  })

  it('lembra a última área e permite fixá-la como padrão', async () => {
    prefs = { area: 'trabalhista' }
    montar()
    expect((await screen.findByTestId('area-ultima-nome')).textContent).toBe('Trabalhista')
    fireEvent.click(screen.getByTestId('fixar-padrao'))
    await waitFor(() => expect(upsert).toHaveBeenCalledWith(expect.objectContaining({ usuario_id: 'u1', area_fixa: 'trabalhista' })))
    expect(screen.getByTestId('area-fixa-nome').textContent).toBe('Trabalhista')
    fireEvent.click(screen.getByTestId('desfixar'))
    await waitFor(() => expect(upsert).toHaveBeenLastCalledWith(expect.objectContaining({ area_fixa: null })))
    expect(screen.getByTestId('area-ultima-nome')).toBeTruthy()
  })

  it('área fixa entra sozinha após a contagem de 4 s, a não ser que a pessoa escolha outra', async () => {
    prefs = { area_fixa: 'compliance' }
    montar()
    expect((await screen.findByTestId('area-lembrada')).textContent).toContain('entrando em 4 s')
    fireEvent.click(screen.getByTestId('escolher-outra'))
    expect(screen.getByTestId('area-lembrada').textContent).not.toContain('entrando em')
    cleanup(); vi.useFakeTimers()
    montar()
    await act(async () => { await vi.advanceTimersByTimeAsync(10) })
    expect(screen.getByTestId('area-lembrada').textContent).toContain('entrando em 4 s')
    for (let i = 0; i < 5; i++) await act(async () => { await vi.advanceTimersByTimeAsync(1000) })
    await act(async () => { await Promise.resolve() })
    expect(screen.getByTestId('onde').textContent).toBe('/compliance')
    expect(gravarAreaAtual).toHaveBeenCalledWith('compliance')
  })

  it('diz em qual escritório a pessoa está e deixa sair para trocar de conta', async () => {
    sessionStorage.setItem('lsm-entrada-cargo', '1')
    escritorio = { nome: 'SILVA E SOUZA ADVOGADOS', sede: false, pessoa: 'Ana Silva', email: 'ana@silva.adv.br' }
    alcance = { id: 'u1', cargo: 'pleno', admin: false, veTudo: false }
    montar()
    expect((await screen.findByTestId('inicio-escritorio-nome')).textContent).toBe('SILVA E SOUZA ADVOGADOS')
    expect(screen.getByTestId('inicio-escritorio').textContent).toContain('Ana Silva · ana@silva.adv.br')
    expect((await screen.findByTestId('inicio-hierarquia')).textContent).toContain('você vê os seus')
    fireEvent.click(screen.getByTestId('trocar-de-conta'))
    await waitFor(() => expect(screen.getByTestId('onde').textContent).toBe('/login'))
    expect(signOut).toHaveBeenCalled()
    expect(esquecerEscritorio).toHaveBeenCalled()
  })

  it('divide a entrada em 4 blocos por assunto; números e administração só aparecem para quem pode', async () => {
    sessionStorage.setItem('lsm-entrada-cargo', '1')
    alcance = { id: 'u1', cargo: 'junior', admin: false, veTudo: false }
    montar()
    await screen.findByTestId('inicio-hierarquia')
    expect(screen.getAllByTestId(/^bloco-\d$/).length).toBe(4)
    expect(screen.getByTestId('bloco-1').textContent).toContain('1. Todo dia')
    expect(screen.getByTestId('bloco-2').textContent).toContain('2. Processos')
    expect(screen.getByTestId('bloco-3').textContent).toContain('3. Escrever peças')
    expect(screen.getByTestId('bloco-4').textContent).toContain('4. Escritório')
    expect(screen.queryByTestId('ir-indicadores')).toBeNull()
    expect(screen.queryByTestId('ir-equipe')).toBeNull()
    fireEvent.click(screen.getByTestId('ir-processos-antigos'))
    expect(screen.getByTestId('onde').textContent).toBe('/processos-antigos')
    cleanup()
    alcance = { id: 'u1', cargo: 'socio', admin: true, veTudo: true }
    montar()
    expect(await screen.findByTestId('ir-equipe')).toBeTruthy()
    expect(screen.getByTestId('ir-indicadores')).toBeTruthy()
    expect(screen.getByTestId('inicio-hierarquia').textContent).toContain('enxerga todos os processos')
  })

  it('as matérias que a pessoa marcou como suas aparecem primeiro, e a entrada leva ao "meu jeito de trabalhar"', async () => {
    sessionStorage.setItem('lsm-entrada-cargo', '1')
    localStorage.setItem('theye-meu-jeito', JSON.stringify({ materias: ['trabalhista', 'eleitoral', 'nao_existe'] }))
    alcance = { id: 'u1', cargo: 'pleno', admin: false, veTudo: false }
    montar()
    const minhas = await screen.findByTestId('minhas-materias')
    expect([...minhas.querySelectorAll('button')].map(b => b.getAttribute('data-testid'))).toEqual(['minha-area-trabalhista', 'minha-area-eleitoral'])
    fireEvent.click(screen.getByTestId('minha-area-eleitoral'))
    expect(gravarAreaAtual).toHaveBeenCalledWith('eleitoral')
    cleanup(); localStorage.clear(); montar()
    await screen.findByTestId('inicio-hierarquia')
    expect(screen.queryByTestId('minhas-materias')).toBeNull()
    fireEvent.click(screen.getByTestId('ir-meu-jeito'))
    expect(screen.getByTestId('onde').textContent).toBe('/meu-jeito')
  })

  it('quem administra o escritório lê isso na entrada; quem administra o Instituto lê que cuida da plataforma inteira', async () => {
    sessionStorage.setItem('lsm-entrada-cargo', '1')
    escritorio = { nome: 'SARDAS E MENEZES', sede: true, pessoa: 'Fátima', email: 'f@exemplo.com', instituto: false, advocacia: 'SARDAS E MENEZES' }
    alcance = { id: 'u1', cargo: 'socio', admin: true, veTudo: true }
    montar()
    expect((await screen.findByTestId('inicio-administra')).textContent).toBe('Você administra este escritório: libera quem pede para entrar e define o cargo de cada pessoa.')
    expect(screen.getByTestId('inicio-escritorio-nome').textContent).toBe('SARDAS E MENEZES')
    cleanup()
    escritorio = { nome: 'INSTITUTO THEYE', sede: true, pessoa: 'M', email: 'm@exemplo.com', instituto: true, advocacia: 'SARDAS E MENEZES' }
    montar()
    expect((await screen.findByTestId('inicio-administra')).textContent).toBe('Você administra o Instituto THEYE, que cuida da plataforma inteira, e também o escritório SARDAS E MENEZES.')
    cleanup()
    alcance = { id: 'u1', cargo: 'pleno', admin: false, veTudo: false }
    montar()
    await screen.findByTestId('inicio-hierarquia')
    expect(screen.queryByTestId('inicio-administra')).toBeNull()
  })
})
