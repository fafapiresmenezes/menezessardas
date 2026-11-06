// @vitest-environment jsdom
// Passo D21: tela da administradora de locação — lançamentos do mês, repasse, vistoria com roteiro e laudo.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup, within } from '@testing-library/react'

let lancamentos: object[] = []
let vistorias: object[] = []
const insert = vi.fn(async (_r: unknown): Promise<{ error: null }> => ({ error: null }))
const upsert = vi.fn(async (_r: unknown): Promise<{ error: null }> => ({ error: null }))
const update = vi.fn(async (_r: unknown): Promise<{ error: null }> => ({ error: null }))
const lista = (dados: object[]) => { const q = { eq: () => q, order: () => q, maybeSingle: async () => ({ data: null }), then: (f: (v: { data: object[] }) => unknown) => Promise.resolve({ data: dados }).then(f) }; return q }
vi.mock('@/lib/supabase', () => ({ supabaseConfigurado: true, supabase: { from: (t: string) => ({
  select: () => lista(t === 'lancamentos_locacao' ? lancamentos : t === 'vistorias' ? vistorias : []),
  insert: (r: unknown) => insert(r), upsert: (r: unknown) => upsert(r), update: (r: unknown) => ({ eq: async () => update(r) }),
}) } }))
vi.mock('@/lib/repositorio', () => ({ repositorio: {
  listarContratos: async () => [{ id: 'k1', imovelId: 'i1', parte: 'João Inquilino', valor: 3500, encerradoEm: undefined }, { id: 'k2', imovelId: 'i1', parte: 'Antigo', valor: 100, encerradoEm: '2025-01-01' }],
  listarImoveis: async () => [{ id: 'i1', endereco: 'Rua das Laranjeiras, 10', cidade: 'Rio de Janeiro', uf: 'RJ', proprietario: 'Dona Clara' }],
} }))
vi.mock('@/lib/arquivos', () => ({ enviarArquivo: async (f: File) => 'vistorias/i1/' + f.name, urlAssinada: async () => 'https://x' }))
vi.mock('@/lib/ancoragem', () => ({ baixarArquivo: vi.fn() }))
vi.mock('@/components/Layout', () => ({ default: ({ title, children }: { title: string; children: React.ReactNode }) => <div><h1>{title}</h1>{children}</div> }))
const { default: AdministracaoPage } = await import('./AdministracaoPage')
const { baixarArquivo } = await import('@/lib/ancoragem')
const n = (s: string | null | undefined) => (s ?? '').replace(/ /g, ' ')
const mes = new Date().toISOString().slice(0, 7), comp = mes + '-01'

describe('Administração de locação (D21)', () => {
  beforeEach(() => { cleanup(); insert.mockClear(); upsert.mockClear(); update.mockClear(); lancamentos = []; vistorias = [] })

  it('só contratos ativos; lança aluguel e taxa do mês; repasse e PDF', async () => {
    lancamentos = [{ id: 1, contrato_id: 'k1', competencia: comp, tipo: 'aluguel', descricao: 'Aluguel do mês', valor: 3500, pago_em: '2026-11-05' }, { id: 2, contrato_id: 'k1', competencia: comp, tipo: 'taxa_administracao', descricao: 'Taxa 10%', valor: 350, pago_em: null }, { id: 3, contrato_id: 'k1', competencia: comp, tipo: 'despesa', descricao: 'Encanador', valor: 150, pago_em: '2026-11-06' }]
    render(<AdministracaoPage />)
    await waitFor(() => expect(screen.getByTestId('tabela-lancamentos')).toBeTruthy())
    const opcoes = within(screen.getByTestId('contrato')).getAllByRole('option')
    expect(opcoes).toHaveLength(1); expect(opcoes[0].textContent).toContain('João Inquilino')
    expect(n(screen.getByTestId('saldo-repasse').textContent)).toBe('R$ 3.000,00')
    fireEvent.click(screen.getByTestId('gerar-mes'))
    await waitFor(() => expect(screen.getByRole('status').textContent).toContain('já tem aluguel e taxa'))
    expect(insert).not.toHaveBeenCalled()
    fireEvent.click(screen.getByTestId('registrar-repasse'))
    await waitFor(() => expect(insert).toHaveBeenCalledWith(expect.objectContaining({ tipo: 'repasse', valor: 3000, contrato_id: 'k1' })))
    fireEvent.click(screen.getByTestId('baixar-prestacao'))
    expect(baixarArquivo).toHaveBeenCalledWith(`prestacao-de-contas-${mes}.pdf`, expect.any(Uint8Array), 'application/pdf')
    fireEvent.click(within(screen.getByTestId('tabela-lancamentos')).getAllByText('Marcar pago')[0])
    await waitFor(() => expect(update).toHaveBeenCalledWith(expect.objectContaining({ pago_em: expect.any(String) })))
  })

  it('mês vazio: gera aluguel e taxa pela taxa do contrato; novo lançamento valida valor', async () => {
    render(<AdministracaoPage />)
    await waitFor(() => expect(screen.getByTestId('gerar-mes')).toBeTruthy())
    fireEvent.change(screen.getByTestId('taxa'), { target: { value: '8' } })
    await waitFor(() => expect(upsert).toHaveBeenCalledWith(expect.objectContaining({ taxa_pct: 8 })))
    fireEvent.click(screen.getByTestId('gerar-mes'))
    await waitFor(() => expect(insert).toHaveBeenCalledWith([expect.objectContaining({ tipo: 'aluguel', valor: 3500 }), expect.objectContaining({ tipo: 'taxa_administracao', valor: 280 })]))
    fireEvent.click(screen.getByTestId('novo-lancamento'))
    fireEvent.click(screen.getByTestId('salvar-lancamento'))
    expect(screen.getByRole('alert').textContent).toContain('valor maior que zero')
    fireEvent.change(screen.getByLabelText('Descrição'), { target: { value: 'IPTU' } }); fireEvent.change(screen.getByLabelText('Valor'), { target: { value: '120,50' } })
    fireEvent.click(screen.getByTestId('salvar-lancamento'))
    await waitFor(() => expect(insert).toHaveBeenCalledWith(expect.objectContaining({ tipo: 'despesa', descricao: 'IPTU', valor: 120.5, competencia: comp })))
  })

  it('vistoria: roteiro padrão, estado geral pelo pior item, fotos anexadas, salva; diferenças entre entrada e saída', async () => {
    vistorias = [
      { id: 1, imovel_id: 'i1', contrato_id: 'k1', tipo: 'entrada', data: '2026-01-10', estado_geral: 'bom', itens: [{ comodo: 'Sala', item: 'Piso', estado: 'bom' }], fotos: [{ caminho: 'vistorias/i1/a.jpg', legenda: 'sala' }], observacoes: null, responsavel: null },
      { id: 2, imovel_id: 'i1', contrato_id: 'k1', tipo: 'saida', data: '2026-11-01', estado_geral: 'ruim', itens: [{ comodo: 'Sala', item: 'Piso', estado: 'ruim' }], fotos: [], observacoes: null, responsavel: null },
    ]
    render(<AdministracaoPage />)
    await waitFor(() => expect(screen.getByTestId('aba-vistoria')).toBeTruthy())
    fireEvent.click(screen.getByTestId('aba-vistoria'))
    await waitFor(() => expect(screen.getByTestId('lista-vistorias')).toBeTruthy())
    expect(screen.getByTestId('diferencas').textContent).toContain('Sala · Piso: Bom → Ruim')
    fireEvent.click(screen.getByTestId('nova-periodica'))
    const itens = within(screen.getByTestId('itens-vistoria')).getAllByRole('row').slice(1)
    expect(itens.length).toBeGreaterThan(20)
    expect(screen.getByTestId('estado-geral').textContent).toBe('Bom')
    fireEvent.change(screen.getByLabelText('Estado de Chuveiro (Banheiro)'), { target: { value: 'regular' } })
    expect(screen.getByTestId('estado-geral').textContent).toBe('Regular')
    const foto = new File(['x'], 'cozinha.jpg', { type: 'image/jpeg' })
    fireEvent.change(screen.getByTestId('fotos'), { target: { files: [foto] } })
    await waitFor(() => expect(screen.getByTestId('fotos-anexadas').textContent).toContain('1 foto'))
    fireEvent.click(screen.getByTestId('salvar-vistoria'))
    await waitFor(() => expect(insert).toHaveBeenCalledWith(expect.objectContaining({ tipo: 'periodica', estado_geral: 'regular', imovel_id: 'i1', fotos: [{ caminho: 'vistorias/i1/cozinha.jpg', legenda: 'cozinha' }] })))
    fireEvent.click(screen.getAllByText('Laudo (PDF)')[0])
    expect(baixarArquivo).toHaveBeenCalledWith('laudo-vistoria-entrada-2026-01-10.pdf', expect.any(Uint8Array), 'application/pdf')
  })
})
