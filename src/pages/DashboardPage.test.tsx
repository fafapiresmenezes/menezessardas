// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup, within } from '@testing-library/react'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'

let loading = false
let imoveis: object[] = []
let alertas: object[] = []
let sede = false
const rpc = vi.fn(async (_f: string) => ({ data: [
  { id: 's', nome: 'GMenezes (sede)', pessoas: 5, imoveis: 12, contratos_ativos: 8, casos_abertos: 4, horas_mes: 120.5 },
  { id: 'p', nome: 'Escritório Alfa', pessoas: 2, imoveis: 3, contratos_ativos: 2, casos_abertos: 1, horas_mes: 30 },
] }))
vi.mock('@/lib/supabase', () => ({ supabaseConfigurado: true, supabase: { rpc: (f: string) => rpc(f) } }))
vi.mock('@/lib/equipe', () => ({ ehSede: async () => sede }))
vi.mock('@/hooks/useImoveis', () => ({ useImoveis: () => ({ imoveis, loading }) }))
vi.mock('@/hooks/useAlertas', () => ({ useAlertas: () => ({ alertas, loading }) }))
vi.mock('@/components/MetasDoMes', () => ({ default: () => <div data-testid="metas-stub" /> }))
vi.mock('@/components/Layout', () => ({ default: ({ title, children }: { title: string; children: React.ReactNode }) => <div><h1>{title}</h1>{children}</div> }))
const { default: DashboardPage } = await import('./DashboardPage')
const Onde = () => <p data-testid="onde">{useLocation().pathname}{useLocation().search}</p>
const montar = () => render(<MemoryRouter><Routes><Route path="*" element={<><DashboardPage /><Onde /></>} /></Routes></MemoryRouter>)

describe('Painel', () => {
  beforeEach(() => { cleanup(); loading = false; sede = false; rpc.mockClear()
    imoveis = [
      { id: 'i1', endereco: 'Rua das Flores 123', tipo: 'apartamento', documentos: [] },
      { id: 'i2', endereco: 'Av. Atlântica 500', tipo: 'loja', documentos: [] },
      { id: 'i3', endereco: 'Rua B 9', tipo: 'casa', documentos: [] },
    ]
    alertas = [
      { id: 'a1', imovelId: 'i1', imovel: 'Rua das Flores 123', tipo: 'contrato', titulo: 'Fim do contrato', dataEvento: '2026-11-10', diasRestantes: 8 },
      { id: 'a2', imovelId: 'i1', imovel: 'Rua das Flores 123', tipo: 'documento', titulo: 'IPTU', dataEvento: '2027-03-01', diasRestantes: 120 },
      { id: 'a3', imovelId: 'i2', imovel: 'Av. Atlântica 500', tipo: 'contrato', titulo: 'Reajuste', dataEvento: '2026-10-20', diasRestantes: -13 },
    ] })

  it('indicadores contam por situação e abrem a lista filtrada; leitura rápida; cartões com urgência e alertas; compromissos por urgência', () => {
    montar()
    expect(screen.getByTestId('leitura-painel').textContent).toContain('Atenção: 1 imóvel(is) com documento ou contrato vencido e 1 vencendo em 30 dias.')
    expect(screen.getByTestId('indicador-todos').textContent).toContain('3'); expect(screen.getByTestId('indicador-vencido').textContent).toContain('1')
    expect(screen.getByTestId('indicador-critico').textContent).toContain('1'); expect(screen.getByTestId('indicador-em_dia').textContent).toContain('1')
    fireEvent.click(screen.getByTestId('indicador-vencido'))
    expect(screen.getByTestId('onde').textContent).toBe('/imoveis?situacao=vencido')
    expect(screen.getByRole('button', { name: 'Rua das Flores 123 - Vence em 8 dias' }).textContent).toContain('2 alertas')
    expect(screen.getByRole('button', { name: 'Rua B 9 - Sem prazo definido' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Av. Atlântica 500 - Vencido há 13 dias' }))
    expect(screen.getByTestId('onde').textContent).toBe('/imoveis/i2')
    const linhas = within(screen.getByRole('region', { name: 'Tabela de próximos compromissos' })).getAllByRole('row').slice(1) as HTMLTableRowElement[]
    expect(linhas.map(l => l.cells[1].textContent)).toEqual(['Reajuste', 'Fim do contrato', 'IPTU'])
    expect(linhas[0].textContent).toContain('20/10/2026')
    expect(screen.getByTestId('metas-stub')).toBeTruthy()
  })

  it('sede vê a tabela por escritório com consolidado; parceiro não vê', async () => {
    sede = true
    montar()
    await waitFor(() => expect(screen.getByTestId('painel-escritorios')).toBeTruthy())
    expect(rpc).toHaveBeenCalledWith('painel_escritorios')
    expect(screen.getAllByTestId('linha-escritorio').length).toBe(2)
    const rodape = screen.getByText('Consolidado').closest('tr')!
    expect(Array.from(rodape.cells).map(c => c.textContent)).toEqual(['Consolidado', '7', '15', '10', '5', '150,5'])
    cleanup(); sede = false; rpc.mockClear()
    montar()
    await waitFor(() => expect(screen.getByTestId('leitura-painel')).toBeTruthy())
    expect(rpc).not.toHaveBeenCalled()
    expect(screen.queryByTestId('painel-escritorios')).toBeNull()
  })

  it('carregando mostra esqueleto; carteira vazia convida a cadastrar; em ordem sem vencidos; copiar e baixar o painel', () => {
    loading = true; montar()
    expect(screen.queryByTestId('leitura-painel')).toBeNull(); expect(document.querySelector('.animate-pulse')).toBeTruthy()
    cleanup(); loading = false; imoveis = []; alertas = []
    montar()
    expect(screen.getByTestId('leitura-painel').textContent).toContain('Nenhum imóvel cadastrado ainda.')
    expect(screen.getByText('Nenhum compromisso próximo')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Novo imóvel' }))
    expect(screen.getByTestId('onde').textContent).toBe('/imoveis/novo')
    cleanup(); imoveis = [{ id: 'i3', endereco: 'Rua B 9', tipo: 'casa', documentos: [] }]; alertas = [{ id: 'a9', imovelId: 'i3', imovel: 'Rua B 9', tipo: 'contrato', titulo: 'Fim', dataEvento: '2027-06-01', diasRestantes: 200 }]
    const write = vi.fn(async (_t: string) => undefined); Object.assign(navigator, { clipboard: { writeText: write } })
    URL.createObjectURL = vi.fn(() => 'blob:x'); URL.revokeObjectURL = vi.fn()
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined)
    montar()
    expect(screen.getByTestId('leitura-painel').textContent).toContain('Carteira em ordem: nada vencido nem vencendo nos próximos 30 dias.')
    fireEvent.click(screen.getByTestId('copiar-painel'))
    expect(write.mock.calls[0][0]).toContain('Imóveis: 1\nVencidos: 0\nVencem em 30 dias: 0\nEm dia: 1')
    fireEvent.click(screen.getByTestId('baixar-painel'))
    expect(click).toHaveBeenCalled(); expect(screen.getByTestId('baixar-painel').textContent).toBe('baixado')
    click.mockRestore()
  })
})
