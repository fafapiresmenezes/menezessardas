// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, cleanup, within, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'
import { rotulosIndice, rotulosGarantia } from '@/lib/rotulos'

const emDias = (n: number) => { const d = new Date(); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10) }
const br = (iso: string) => iso.split('-').reverse().join('/')
const imoveis = [
  { id: 'i1', endereco: 'Rua das Flores 123', cidade: 'Rio de Janeiro', uf: 'RJ', tipo: 'apartamento', uso: 'locado', proprietario: 'João Silva', matricula: '111', areaM2: 85, notas: 'Vaga 12\nChaves com o porteiro', documentos: [{ id: 'd1', tipo: 'iptu', nome: 'IPTU 2026', enviadoEm: '2026-01-10', dataVencimento: emDias(200) }] },
  { id: 'i2', endereco: 'Av. Atlântica 500', cidade: 'Rio de Janeiro', uf: 'RJ', tipo: 'loja', uso: 'uso_proprio', proprietario: 'Maria Souza', matricula: '', notas: '', documentos: [] },
]
const base = { periodicidade: 'mensal', indice: 'fixo', garantia: 'caucao', dataUltimoReajuste: null, notas: '', criadoEm: '2025-01-01', documentos: [] as unknown[] }
const contratos = [
  { ...base, id: 'c1', imovelId: 'i1', tipo: 'locacao_residencial', parte: 'Ana Locatária', dataInicio: '2025-11-01', dataVencimento: emDias(20), valor: 3500, documentos: [{ id: 'cd1', tipo: 'contrato', nome: 'Contrato assinado.pdf', enviadoEm: '2025-11-01' }] },
  { ...base, id: 'c2', imovelId: 'i1', contratoPaiId: 'c1', natureza: 'aditivo', tipo: 'locacao_residencial', parte: 'Ana Locatária', dataInicio: '2026-05-01', dataVencimento: emDias(20), valor: 0 },
  { ...base, id: 'c3', imovelId: 'i1', tipo: 'locacao_residencial', parte: 'Pedro Antigo', dataInicio: '2023-01-01', dataVencimento: '2024-12-31', valor: 2800, encerradoEm: '2024-10-15' },
  { ...base, id: 'c4', imovelId: 'i2', tipo: 'locacao_comercial', parte: 'Outra Loja', dataInicio: '2024-01-01', dataVencimento: '2024-06-01', valor: 9000, encerradoEm: '2024-06-01' },
]
let obter = vi.fn(async (id: string) => imoveis.find(i => i.id === id) ?? null)
vi.mock('@/lib/repositorio', async (orig) => {
  const real = await orig() as object
  return { ...real, repositorio: { obterImovel: (id: string) => obter(id), listarContratos: async () => contratos, listarImoveis: async () => imoveis } }
})
vi.mock('@/components/GraficoTendencia', () => ({ default: ({ pontos }: { pontos: unknown[] }) => <div data-testid="grafico-stub">{pontos.length} meses</div> }))
vi.mock('@/components/AcessoRestrito', () => ({ default: ({ imovelId }: { imovelId: string }) => <div data-testid="acesso-stub">{imovelId}</div> }))
vi.mock('@/components/Layout', () => ({ default: ({ title, children }: { title: string; children: React.ReactNode }) => <div><h1>{title}</h1>{children}</div> }))
const { default: ImovelDetailPage } = await import('./ImovelDetailPage')
const Onde = () => <p data-testid="onde">{useLocation().pathname}</p>
const montar = (id: string) => render(<MemoryRouter initialEntries={[`/imoveis/${id}`]}><Routes><Route path="/imoveis/:id" element={<><ImovelDetailPage /><Onde /></>} /><Route path="*" element={<Onde />} /></Routes></MemoryRouter>)
const secao = (id: string) => document.querySelector(`section[aria-labelledby="${id}"]`) as HTMLElement

describe('Ficha do imóvel', () => {
  beforeEach(() => { cleanup(); obter = vi.fn(async (id: string) => imoveis.find(i => i.id === id) ?? null) })

  it('carrega a ficha, o contrato vigente com instrumentos vinculados, compromissos (o aditivo também vence), documentos do imóvel e do contrato e o histórico', async () => {
    montar('i1')
    expect(screen.getByText('Carregando ficha do imóvel…')).toBeTruthy()
    await waitFor(() => expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Rua das Flores 123'))
    const ficha = secao('t-ficha')
    const dado = (r: string) => within(ficha).getByText(r).nextElementSibling!.textContent
    expect(dado('Tipo')).toBe('Apartamento'); expect(dado('Uso')).toBe('Locado'); expect(dado('Proprietário')).toBe('João Silva'); expect(dado('Matrícula')).toBe('111'); expect(dado('Cidade')).toBe('Rio de Janeiro / RJ'); expect(dado('Área')).toBe('85 m²')
    expect(within(ficha).getByText(/Chaves com o porteiro/).textContent).toContain('Vaga 12')
    expect(screen.getByText('Gerir contrato').closest('a')!.getAttribute('href')).toBe('/contrato/i1')
    const vig = secao('t-contrato')
    expect(within(vig).getByText('Ana Locatária')).toBeTruthy()
    expect(vig.textContent).toContain('Locação residencial')
    expect(vig.textContent!.replace(/ /g, ' ')).toContain('R$ 3.500,00')
    expect(vig.textContent).toContain(`01/11/2025 → ${br(emDias(20))}`)
    expect(vig.textContent).toContain(rotulosIndice.fixo); expect(vig.textContent).toContain(rotulosGarantia.caucao)
    expect(vig.textContent).toContain('1 instrumento vinculado')
    expect(screen.getAllByText('Vence em 20 dias').length).toBeGreaterThanOrEqual(2)
    const comp = secao('t-comp')
    expect(within(comp).getAllByRole("listitem").map(l => l.querySelector("p")!.textContent)).toEqual(['Vencimento de contrato', 'Vencimento de contrato', 'Vencimento de documento: IPTU 2026'])
    expect(comp.textContent).toContain(br(emDias(200)))
    expect(screen.getByTestId('grafico-stub').textContent).toBe('12 meses')
    expect(screen.getByTestId('acesso-stub').textContent).toBe('i1')
    const docs = secao('t-docs')
    expect(within(docs).getByRole('heading').textContent).toContain('Documentos (2)')
    const itens = within(docs).getAllByRole('listitem').map(l => l.textContent)
    expect(itens[0]).toContain('IPTU 2026'); expect(itens[0]).toContain('IPTU · Imóvel · enviado em 10/01/2026')
    expect(itens[1]).toContain('Contrato assinado.pdf'); expect(itens[1]).toContain('Ana Locatária · enviado em 01/11/2025'); expect(itens[1]).toContain('Sem vencimento')
    const hist = secao('t-hist')
    expect(within(hist).getAllByRole('listitem').length).toBe(1)
    expect(hist.textContent).toContain('Pedro Antigo'); expect(hist.textContent).toContain('01/01/2023 → 31/12/2024'); expect(hist.textContent).toContain('Encerrado em 15/10/2024')
  })

  it('imóvel sem contrato vigente convida a cadastrar, sem compromissos nem documentos, só histórico; copiar link e voltar para a lista', async () => {
    const write = vi.fn(async (_t: string) => undefined); Object.assign(navigator, { clipboard: { writeText: write } })
    montar('i2')
    await waitFor(() => expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Av. Atlântica 500'))
    expect(screen.getByText('Cadastrar contrato').closest('a')!.getAttribute('href')).toBe('/contrato/i2')
    expect(screen.getByText('Sem compromissos')).toBeTruthy()
    expect(screen.getByText('Este imóvel não tem contrato vigente.')).toBeTruthy()
    expect(screen.getByText('Cadastrar o primeiro contrato').closest('a')!.getAttribute('href')).toBe('/contrato/novo?imovelId=i2')
    expect(screen.getByText('Nenhum compromisso nos próximos 400 dias')).toBeTruthy()
    expect(screen.getByText('Ver agenda').getAttribute('href')).toBe('/agenda')
    expect(screen.getByText('Documentos (0)')).toBeTruthy()
    expect(screen.getByText(/Nenhum documento\. Anexe pela tela do contrato/)).toBeTruthy()
    expect(within(secao('t-hist')).getAllByRole('listitem').length).toBe(1); expect(secao('t-hist').textContent).toContain('Outra Loja'); expect(secao('t-hist').textContent).toContain('Encerrado em 01/06/2024')
    expect(within(secao('t-ficha')).getByText('Matrícula').nextElementSibling!.textContent).toBe('—')
    expect(within(secao('t-ficha')).getByText('Área').nextElementSibling!.textContent).toBe('—')
    expect(screen.queryByText('Notas')).toBeNull()
    fireEvent.click(screen.getByTestId('copiar-link-imovel'))
    expect(write).toHaveBeenCalledWith(window.location.href)
    fireEvent.click(screen.getByRole('button', { name: 'Imóveis' }))
    expect(screen.getByTestId('onde').textContent).toBe('/imoveis')
  })

  it('imóvel inexistente mostra aviso e volta para a lista', async () => {
    montar('nao-existe')
    await waitFor(() => expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Imóvel não encontrado'))
    expect(obter).toHaveBeenCalledWith('nao-existe')
    expect(screen.getByText(/Não encontramos este imóvel/)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Voltar para imóveis' }))
    expect(screen.getByTestId('onde').textContent).toBe('/imoveis')
  })
})
