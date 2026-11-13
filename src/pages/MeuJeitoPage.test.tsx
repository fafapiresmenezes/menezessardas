// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup, within } from '@testing-library/react'

vi.mock('@/components/Layout', () => ({ default: ({ title, children }: { title: string; children: React.ReactNode }) => <div><h1>{title}</h1>{children}</div> }))
let visao = { veTudo: false, admin: false, instituto: false, sede: true }
vi.mock('@/lib/visao', () => ({ minhaVisao: async () => visao }))
const definirMinhaPreferencia = vi.fn(async (_p: { telaInicial?: string }) => undefined)
vi.mock('@/lib/preferencias', () => ({ minhaPreferencia: async () => ({ telaInicial: '/agenda' }), definirMinhaPreferencia: (p: { telaInicial?: string }) => definirMinhaPreferencia(p) }))
vi.mock('@/lib/supabase', () => ({ supabaseConfigurado: false, supabase: {} }))
const { default: MeuJeitoPage } = await import('./MeuJeitoPage')
const escolhidos = () => within(screen.getByTestId('jeito-escolhidos')).getAllByRole('listitem').map(li => li.textContent!.split(' · ')[0])
const guardado = () => JSON.parse(localStorage.getItem('theye-meu-jeito') || '{}')

describe('Meu jeito de trabalhar', () => {
  beforeEach(() => { cleanup(); localStorage.clear(); document.documentElement.removeAttribute('data-letra'); visao = { veTudo: false, admin: false, instituto: false, sede: true }; definirMinhaPreferencia.mockClear() })

  it('a pessoa monta o próprio menu: põe tela, muda a ordem e tira; vale só para ela e fica guardado', async () => {
    render(<MeuJeitoPage />)
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Meu jeito de trabalhar')
    expect(escolhidos()).toEqual(['Início', 'Meu dia', 'Agenda', 'Intimações', 'Meus processos', 'Inserir processos antigos', 'Meu jeito de escrever', 'Parâmetros de escrita'])
    fireEvent.click(screen.getByTestId('jeito-por-assistente'))
    await waitFor(() => expect((e => e[e.length - 1])(escolhidos())).toBe('Assistente'))
    expect(screen.queryByTestId('jeito-por-assistente')).toBeNull()
    fireEvent.click(screen.getByLabelText('Subir Assistente'))
    await waitFor(() => expect((e => e[e.length - 2])(escolhidos())).toBe('Assistente'))
    fireEvent.click(screen.getByLabelText('Tirar Início do meu menu'))
    await waitFor(() => expect(escolhidos()[0]).toBe('Meu dia'))
    expect(guardado().atalhos).toEqual(['/meu-dia', '/agenda', '/intimacoes', '/processos', '/processos-antigos', '/meu-estilo', '/assistente', '/parametros-escrita'])
    expect(screen.getByTestId('jeito-aviso').textContent).toBe('Salvo neste aparelho.')
    expect((screen.getByLabelText('Subir Meu dia') as HTMLButtonElement).disabled).toBe(true)
  })

  it('só oferece as telas do nível da pessoa: números do escritório para sócios e gestor, equipe para o administrador', async () => {
    render(<MeuJeitoPage />)
    await waitFor(() => expect(screen.getByTestId('jeito-por-prazos')).toBeTruthy())
    expect(screen.queryByTestId('jeito-por-financeiro')).toBeNull()
    expect(screen.queryByTestId('jeito-por-equipe')).toBeNull()
    cleanup(); visao = { veTudo: true, admin: true, instituto: false, sede: true }
    render(<MeuJeitoPage />)
    expect(await screen.findByTestId('jeito-por-financeiro')).toBeTruthy()
    expect(screen.getByTestId('jeito-por-equipe')).toBeTruthy()
    expect(screen.queryByTestId('jeito-por-instituto')).toBeNull()
  })

  it('escolhe as matérias que usa, a tela de abertura e o tamanho da letra; "voltar ao padrão" desfaz tudo', async () => {
    render(<MeuJeitoPage />)
    fireEvent.click(screen.getByTestId('jeito-materia-trabalhista'))
    await waitFor(() => expect(guardado().materias).toEqual(['trabalhista']))
    fireEvent.click(screen.getByTestId('jeito-materia-constitucional'))
    await waitFor(() => expect(guardado().materias).toEqual(['trabalhista', 'constitucional']))
    expect(screen.getByTestId('jeito-materia-trabalhista').getAttribute('aria-pressed')).toBe('true')
    fireEvent.click(screen.getByTestId('jeito-materia-trabalhista'))
    await waitFor(() => expect(guardado().materias).toEqual(['constitucional']))
    fireEvent.click(screen.getByTestId('jeito-letra-maior'))
    await waitFor(() => expect(document.documentElement.getAttribute('data-letra')).toBe('maior'))
    expect(screen.getByTestId('jeito-letra-maior').getAttribute('aria-checked')).toBe('true')
    await waitFor(() => expect((screen.getByTestId('jeito-tela') as HTMLSelectElement).value).toBe('/agenda'))
    fireEvent.change(screen.getByTestId('jeito-tela'), { target: { value: '/meu-dia' } })
    await waitFor(() => expect(definirMinhaPreferencia).toHaveBeenCalledWith({ telaInicial: '/meu-dia' }))
    fireEvent.click(screen.getByTestId('jeito-padrao'))
    await waitFor(() => expect(screen.getByTestId('jeito-aviso').textContent).toBe('Tudo voltou ao padrão.'))
    expect(guardado()).toEqual({})
    expect(document.documentElement.hasAttribute('data-letra')).toBe(false)
    expect(definirMinhaPreferencia).toHaveBeenLastCalledWith({ telaInicial: undefined })
  })
})
