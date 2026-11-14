// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'

let loading = false
const imoveis = [
  { id: 'i1', endereco: 'Rua das Flores 123', cidade: 'Rio de Janeiro', uf: 'RJ', tipo: 'apartamento', uso: 'locado', proprietario: 'João Silva', matricula: '111', notas: '', documentos: [{ id: 'd1', tipo: 'iptu' }, { id: 'd2', tipo: 'matricula_rgi' }] },
  { id: 'i2', endereco: 'Av. Atlântica 500', cidade: 'Rio de Janeiro', uf: 'RJ', tipo: 'loja', uso: 'uso_proprio', proprietario: 'Maria Souza', matricula: '222', notas: '', documentos: [] },
  { id: 'i3', endereco: 'Rua B 9', cidade: 'Niterói', uf: 'RJ', tipo: 'casa', uso: 'locado', proprietario: 'Carlos', matricula: '333', notas: '', documentos: [] },
]
const alertas = [
  { id: 'a1', imovelId: 'i1', imovel: 'Rua das Flores 123', tipo: 'contrato', titulo: 'Fim do contrato', dataEvento: '2026-11-10', diasRestantes: 8 },
  { id: 'a2', imovelId: 'i1', imovel: 'Rua das Flores 123', tipo: 'documento', titulo: 'IPTU', dataEvento: '2027-03-01', diasRestantes: 120 },
  { id: 'a3', imovelId: 'i2', imovel: 'Av. Atlântica 500', tipo: 'contrato', titulo: 'Reajuste', dataEvento: '2026-10-20', diasRestantes: -13 },
]
vi.mock('@/hooks/useImoveis', () => ({ useImoveis: () => ({ imoveis, loading }) }))
vi.mock('@/hooks/useAlertas', () => ({ useAlertas: () => ({ alertas, loading: false }) }))
vi.mock('@/components/Layout', () => ({ default: ({ title, children }: { title: string; children: React.ReactNode }) => <div><h1>{title}</h1>{children}</div> }))
const { default: ImovelListPage } = await import('./ImovelListPage')
const Onde = () => <p data-testid="onde">{useLocation().pathname}{useLocation().search}</p>
const montar = (rota = '/imoveis') => render(<MemoryRouter initialEntries={[rota]}><Routes><Route path="*" element={<><ImovelListPage /><Onde /></>} /></Routes></MemoryRouter>)
const linhas = () => within(screen.getByRole('table')).getAllByRole('row').slice(1)

describe('Lista de imóveis', () => {
  beforeEach(() => { cleanup(); localStorage.clear(); loading = false })

  it('lista com tipo, uso, documentos e situação pelo prazo mais próximo; busca por endereço ou proprietário é lembrada', () => {
    montar()
    expect(screen.getByRole('status').textContent).toContain('3 imóveis encontrados')
    const l = linhas()
    expect(l[0].textContent).toContain('Apartamento'); expect(l[0].textContent).toContain('Locado'); expect(l[0].textContent).toContain('IPTU'); expect(l[0].textContent).toContain('RGI'); expect(l[0].textContent).toContain('Vence em 8 dias')
    expect(l[1].textContent).toContain('Nenhum'); expect(l[1].textContent).toContain('Vencido há 13 dias')
    expect(l[2].textContent).toContain('Sem prazo definido')
    fireEvent.change(screen.getByLabelText('Buscar imóvel por endereço ou proprietário'), { target: { value: 'maria' } })
    expect(linhas().length).toBe(1)
    expect(screen.getByRole('status').textContent).toContain('1 imóvel encontrado')
    expect(localStorage.getItem('lsm-imoveis-busca')).toBe('maria')
    fireEvent.change(screen.getByLabelText('Buscar imóvel por endereço ou proprietário'), { target: { value: 'xyz' } })
    expect(screen.queryAllByRole('row').length).toBe(1)
    expect(screen.getByText('Nenhum imóvel com esse termo')).toBeTruthy()
  })

  it('filtro por situação vindo do Painel (?situacao=) com rótulo e limpar; ver detalhes navega; atalhos novo e importar', () => {
    montar('/imoveis?situacao=vencido')
    expect(screen.getByTestId('filtro-situacao').textContent).toContain('Mostrando só: Vencidos (1)')
    expect(linhas()[0].textContent).toContain('Av. Atlântica 500')
    fireEvent.click(screen.getByText('limpar filtro'))
    expect(screen.queryByTestId('filtro-situacao')).toBeNull()
    expect(linhas().length).toBe(3)
    cleanup(); montar('/imoveis?situacao=em_dia')
    expect(screen.getByTestId('filtro-situacao').textContent).toContain('Em dia (1)')
    expect(linhas()[0].textContent).toContain('Rua B 9')
    fireEvent.click(screen.getByRole('button', { name: 'Ver detalhes de Rua B 9' }))
    expect(screen.getByTestId('onde').textContent).toBe('/imoveis/i3')
    cleanup(); montar()
    expect(screen.getByText('Novo imóvel').closest('a')!.getAttribute('href')).toBe('/imoveis/novo')
    expect(screen.getByTestId('importar-csv').getAttribute('href')).toBe('/imoveis/importar')
  })

  it('carregando mostra o esqueleto; copiar lista com prazo e baixar CSV', () => {
    loading = true
    montar()
    expect(screen.queryByRole('table')).toBeNull()
    expect(document.querySelector('.animate-pulse')).toBeTruthy()
    cleanup(); loading = false
    const write = vi.fn(async (_t: string) => undefined); Object.assign(navigator, { clipboard: { writeText: write } })
    URL.createObjectURL = vi.fn(() => 'blob:x'); URL.revokeObjectURL = vi.fn()
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined)
    montar()
    fireEvent.click(screen.getByTestId('copiar-imoveis'))
    expect(write.mock.calls[0][0]).toContain('Rua das Flores 123 · João Silva · Vence em 8 dias')
    expect(write.mock.calls[0][0]).toContain('Rua B 9 · Carlos · sem prazo')
    fireEvent.click(screen.getByTestId('baixar-imoveis'))
    expect(click).toHaveBeenCalled()
    expect(screen.getByTestId('baixar-imoveis').textContent).toBe('baixado')
    click.mockRestore()
  })
})
