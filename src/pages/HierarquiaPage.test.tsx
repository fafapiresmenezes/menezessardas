// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'

let perfil: string | null = 'admin'
let pessoas: object[] = []
let cargos: Record<string, string> = {}
let tarefas: { responsavel_id: string | null }[] = []
const definirCargo = vi.fn(async (id: string, cargo: string | null) => {
  if (cargo) cargos[id] = cargo
  else delete cargos[id]
  return { ...cargos }
})

vi.mock('@/lib/equipe', async () => {
  const real = await vi.importActual<typeof import('@/lib/equipe')>('@/lib/equipe')
  return { ...real, perfilAtual: async () => perfil, listarPessoas: async () => pessoas }
})
vi.mock('@/lib/hierarquia', async () => {
  const real = await vi.importActual<typeof import('@/lib/hierarquia')>('@/lib/hierarquia')
  return {
    ...real,
    lerCargos: async () => ({ ...cargos }),
    definirCargo: (id: string, cargo: string | null) => definirCargo(id, cargo),
    meuAlcance: async () => ({ id: 'p1', cargo: null, admin: true, veTudo: true }),
  }
})
vi.mock('@/lib/supabase', () => ({
  supabaseConfigurado: true,
  supabase: { from: () => ({ select: () => ({ eq: async () => ({ data: tarefas }) }) }) },
}))
vi.mock('@/components/Layout', () => ({ default: ({ title, children }: { title: string; children: React.ReactNode }) => <div><h1>{title}</h1>{children}</div> }))
const { default: HierarquiaPage } = await import('./HierarquiaPage')

describe('Hierarquia', () => {
  beforeEach(() => {
    cleanup(); definirCargo.mockClear(); perfil = 'admin'; cargos = { p2: 'pleno' }
    tarefas = [{ responsavel_id: 'p2' }, { responsavel_id: null }, { responsavel_id: null }, { responsavel_id: null }]
    pessoas = [
      { id: 'p1', nome: 'Administradora', email: 'a@exemplo.com', funcao: 'admin', confirmado: true, ultimoAcesso: null },
      { id: 'p2', nome: 'Hélio', email: 'h@exemplo.com', funcao: 'operador', confirmado: true, ultimoAcesso: null },
      { id: 'p3', nome: 'Rita', email: 'r@exemplo.com', funcao: 'leitor', confirmado: true, ultimoAcesso: null },
      { id: 'p4', nome: 'Sem Liberação', email: 's@exemplo.com', funcao: null, confirmado: false, ultimoAcesso: null },
    ]
  })

  it('quem não administra o escritório não alcança a tela', async () => {
    perfil = 'operador'
    render(<HierarquiaPage />)
    await waitFor(() => expect(screen.getByTestId('sem-permissao')).toBeTruthy())
    expect(screen.queryByTestId('cargo-p2')).toBeNull()
    expect(screen.queryByText(/Pessoas com acesso/)).toBeNull()
  })

  it('lista quem tem acesso, explica cada cargo e deixa a própria administradora se definir', async () => {
    render(<HierarquiaPage />)
    await waitFor(() => expect(screen.getByText('Pessoas com acesso (3)')).toBeTruthy())
    // quem ainda espera liberação não entra na lista de cargos
    expect(screen.queryByTestId('pessoa-p4')).toBeNull()
    // a explicação reaproveita os textos de hierarquia.ts, com os quatro cargos e o "sem cargo"
    const explica = screen.getByTestId('o-que-cada-cargo-ve').textContent ?? ''
    expect(explica).toContain('Sócio(a)')
    expect(explica).toContain('Vê todos os processos e números do escritório.')
    expect(explica).toContain('Sem cargo definido')
    // a própria administradora aparece, marcada, e pode se dar o cargo de sócia
    expect(screen.getByTestId('pessoa-p1').textContent).toContain('(você)')
    fireEvent.change(screen.getByTestId('cargo-p1'), { target: { value: 'socio' } })
    await waitFor(() => expect(definirCargo).toHaveBeenCalledWith('p1', 'socio'))
    await waitFor(() => expect(screen.getByRole('status').textContent).toContain('Administradora: Sócio(a)'))
    expect((screen.getByTestId('cargo-p1') as HTMLSelectElement).value).toBe('socio')
  })

  it('conta quem está sem cargo e cai para zero quando todos têm', async () => {
    render(<HierarquiaPage />)
    await waitFor(() => expect(screen.getByTestId('sem-cargo').textContent).toContain('Falta definir o cargo de 2 pessoas'))
    fireEvent.change(screen.getByTestId('cargo-p1'), { target: { value: 'socio' } })
    await waitFor(() => expect(screen.getByTestId('sem-cargo').textContent).toContain('Falta definir o cargo de 1 pessoa'))
    fireEvent.change(screen.getByTestId('cargo-p3'), { target: { value: 'junior' } })
    await waitFor(() => expect(screen.getByTestId('sem-cargo').textContent).toContain('Todas as pessoas com acesso já têm cargo definido'))
    // tirar o cargo de alguém volta a contar
    fireEvent.change(screen.getByTestId('cargo-p2'), { target: { value: 'nenhum' } })
    await waitFor(() => expect(definirCargo).toHaveBeenCalledWith('p2', null))
    await waitFor(() => expect(screen.getByTestId('sem-cargo').textContent).toContain('Falta definir o cargo de 1 pessoa'))
  })

  it('mostra, a partir dos dados, quantos processos ainda não têm responsável, sem oferecer distribuição em massa', async () => {
    render(<HierarquiaPage />)
    const bloco = await waitFor(() => {
      const el = screen.getByTestId('processos-sem-responsavel')
      expect(el.textContent).toContain('3')
      return el
    })
    expect(bloco.textContent).toContain('de 4')
    expect(bloco.textContent).toContain('não têm advogado responsável')
    expect(bloco.textContent).toContain('decisão do escritório')
    expect(bloco.querySelector('button')).toBeNull()
  })
})
