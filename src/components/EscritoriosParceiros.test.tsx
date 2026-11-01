// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'

const SEDE = '00000000-0000-0000-0000-000000000001'
const sede = { id: SEDE, nome: 'GMenezes (sede)', plano: 'sede', criadoEm: '2026-10-01', operadores: 3, leitores: 2, mensal: 0, mensal1Ano: 0 }
const parceiro = { id: 'e2', nome: 'Escritório Alfa', plano: 'parceiro', criadoEm: '2026-11-01', operadores: 2, leitores: 1, mensal: 900, mensal1Ano: 630 }
let escritorios = [sede, parceiro]
const criarEscritorio = vi.fn(async (_n: string) => undefined)
const moverParaEscritorio = vi.fn(async (_p: string, _e: string) => undefined)
vi.mock('@/lib/equipe', () => ({
  SEDE_ID: '00000000-0000-0000-0000-000000000001',
  listarEscritorios: async () => escritorios,
  escritorioDasPessoas: async () => ({ p1: SEDE }),
  criarEscritorio: (n: string) => criarEscritorio(n),
  moverParaEscritorio: (p: string, e: string) => moverParaEscritorio(p, e),
}))
let convites: object[] = []
let aceites: object[] = []
const invoke = vi.fn()
vi.mock('@/lib/supabase', () => ({
  supabaseConfigurado: true,
  supabase: {
    from: () => ({ select: () => ({ order: () => ({ order: () => ({ limit: async () => ({ data: [] }) }), limit: async () => ({ data: convites }) }) }) }),
    rpc: (nome: string) => nome === 'aceites_contrato_saas' ? Promise.resolve({ data: aceites }) : Promise.resolve({ data: [{ pix_chave: '', pix_nome: '', pix_cidade: '' }] }),
    functions: { invoke },
  },
}))
vi.mock('@/components/FaturasParceiros', () => ({ default: () => <div data-testid="faturas-stub" /> }))
vi.mock('@/components/MarcaParceiros', () => ({ default: () => <div data-testid="marca-stub" /> }))
const { default: EscritoriosParceiros } = await import('./EscritoriosParceiros')
const pessoas = [{ id: 'p1', nome: 'Ana', email: 'ana@exemplo.com', funcao: 'operador' as const, criadoEm: '2026-10-01', confirmado: true, ultimoAcesso: null }]

describe('Escritórios parceiros (cobrança por usuário)', () => {
  beforeEach(() => { cleanup(); escritorios = [sede, parceiro]; convites = []; aceites = []; invoke.mockReset(); criarEscritorio.mockClear(); moverParaEscritorio.mockClear() })

  it('tabela de cobrança: sede sem cobrança, parceiro com mensal e 1º ano com desconto, total dos parceiros', async () => {
    render(<EscritoriosParceiros pessoas={pessoas} aoMudar={() => {}} />)
    const tabela = await screen.findByTestId('tabela-cobranca')
    await waitFor(() => expect(tabela.textContent).toContain('Escritório Alfa'))
    const t = tabela.textContent!.replace(/ /g, ' ')
    expect(t).toContain('(sede, sem cobrança)')
    expect(t).toContain('R$ 900,00')
    expect(t).toContain('R$ 630,00')
    expect(t).toContain('Receita mensal dos parceirosR$ 900,00')
    expect(screen.getByTestId('sem-aceites-saas')).toBeTruthy()
  })

  it('criar escritório exige 3 letras, chama a rotina e mover pessoa chama aoMudar', async () => {
    const aoMudar = vi.fn()
    render(<EscritoriosParceiros pessoas={pessoas} aoMudar={aoMudar} />)
    await screen.findAllByText('Escritório Alfa')
    const criar = screen.getByTestId('criar-escritorio') as HTMLButtonElement
    expect(criar.disabled).toBe(true)
    fireEvent.change(screen.getByLabelText('Nome do novo escritório'), { target: { value: 'Beta Advogados' } })
    expect(criar.disabled).toBe(false)
    fireEvent.click(criar)
    await waitFor(() => expect(criarEscritorio).toHaveBeenCalledWith('Beta Advogados'))
    expect((await screen.findByRole('status')).textContent).toContain('Escritório criado')
    fireEvent.change(screen.getByLabelText('Escritório de Ana'), { target: { value: 'e2' } })
    await waitFor(() => expect(moverParaEscritorio).toHaveBeenCalledWith('p1', 'e2'))
    expect(aoMudar).toHaveBeenCalled()
  })

  it('convite por e-mail: botão só com nome e e-mail, mostra link e lista convites pendentes; erro do servidor vira aviso', async () => {
    convites = [{ id: 'c1', nome_escritorio: 'Gama', email: 'g@exemplo.com', funcao: 'leitor', criado_em: '2026-11-01T00:00:00Z', expira_em: '2099-01-01T00:00:00Z', aceito_em: null }]
    aceites = [{ escritorio_id: 'e2', nome: 'Escritório Alfa', versao: '1', hash: 'abcdef1234567890', aceito_em: '2026-11-01T00:00:00Z' }]
    invoke.mockResolvedValue({ data: { link: 'https://x/convite/abc', enviado: true }, error: null })
    render(<EscritoriosParceiros pessoas={pessoas} aoMudar={() => {}} />)
    const item = await screen.findByTestId('convite-item')
    expect(item.textContent).toContain('Gama · g@exemplo.com · leitor')
    expect(item.textContent).toContain('pendente')
    expect((await screen.findByTestId('aceite-saas-item')).textContent).toContain('hash abcdef123456')
    const btn = screen.getByTestId('convidar-parceiro') as HTMLButtonElement
    expect(btn.disabled).toBe(true)
    fireEvent.change(screen.getByTestId('convite-escritorio'), { target: { value: 'Delta' } })
    fireEvent.change(screen.getByTestId('convite-email'), { target: { value: 'd@exemplo.com' } })
    expect(btn.disabled).toBe(false)
    fireEvent.click(btn)
    expect((await screen.findByTestId('link-convite')).textContent).toContain('https://x/convite/abc')
    expect(screen.getByRole('status').textContent).toBe('Convite enviado para d@exemplo.com.')
    expect(invoke).toHaveBeenCalledWith('convidar-parceiro', { body: { convidar: { nome_escritorio: 'Delta', email: 'd@exemplo.com', funcao: 'operador' } } })
    invoke.mockResolvedValue({ data: { erro: 'E-mail já convidado' }, error: null })
    fireEvent.change(screen.getByTestId('convite-escritorio'), { target: { value: 'Delta' } })
    fireEvent.change(screen.getByTestId('convite-email'), { target: { value: 'd@exemplo.com' } })
    fireEvent.click(btn)
    await waitFor(() => expect(screen.getByRole('status').textContent).toBe('E-mail já convidado'))
  })
})
