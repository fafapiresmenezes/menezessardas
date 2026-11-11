// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, cleanup, within, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'
// A aba abre no clique e recebe o link assinado depois (Safari bloqueia window.open após await).
const aba = { location: { href: '' }, close: () => undefined, opener: null as unknown }

const emDias = (n: number) => { const d = new Date(); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10) }
type Doc = { id: string; tipo: string; nome: string; enviadoEm: string; caminhoStorage?: string; dataVencimento?: string }
type Ctr = Record<string, unknown> & { id: string; imovelId: string; documentos: Doc[]; encerradoEm?: string; motivoEncerramento?: string }
let imoveis: Record<string, unknown>[] = []
let contratos: Ctr[] = []
const reset = () => {
  imoveis = [
    { id: 'i1', endereco: 'Rua das Flores 123', cidade: 'Rio de Janeiro', uf: 'RJ', tipo: 'apartamento', uso: 'locado', proprietario: 'João Silva', matricula: '111', notas: '', documentos: [] },
    { id: 'i2', endereco: 'Av. Atlântica 500', cidade: 'Rio de Janeiro', uf: 'RJ', tipo: 'loja', uso: 'uso_proprio', proprietario: 'Maria Souza', matricula: '', notas: '', documentos: [{ id: 'd9', tipo: 'iptu', nome: 'IPTU loja', enviadoEm: '2026-01-10' }] },
  ]
  contratos = [
    { id: 'c1', imovelId: 'i1', tipo: 'locacao_residencial', parte: 'Ana Locatária', dataInicio: '2025-11-01', dataVencimento: emDias(20), valor: 3500, periodicidade: 'mensal', indice: 'ipca', garantia: 'caucao', dataUltimoReajuste: null, notas: 'Chaves com o porteiro', criadoEm: '2025-11-01', arquivo: { nome: 'instrumento.pdf', tamanho: 1000, caminhoStorage: 'contratos/c1/instrumento.pdf' }, documentos: [{ id: 'cd1', tipo: 'contrato', nome: 'Contrato assinado.pdf', enviadoEm: '2025-11-01', caminhoStorage: 'contratos/c1/assinado.pdf' }] },
    { id: 'c2', imovelId: 'i1', contratoPaiId: 'c1', natureza: 'aditivo', tipo: 'locacao_residencial', parte: 'Ana Locatária', dataInicio: '2026-05-01', dataVencimento: null, valor: 0, periodicidade: 'mensal', indice: 'ipca', garantia: 'caucao', dataUltimoReajuste: null, notas: '', criadoEm: '2026-05-01', documentos: [] },
  ]
}
reset()
const atualizarContrato = vi.fn(async (id: string, dados: Record<string, unknown>) => { Object.assign(contratos.find(c => c.id === id)!, dados) })
const encerrarContrato = vi.fn(async (id: string, motivo: string) => { Object.assign(contratos.find(c => c.id === id)!, { encerradoEm: '2026-11-01', motivoEncerramento: motivo }) })
const anexarDocumento = vi.fn(async (alvo: object, doc: { tipo: string; nome: string; caminhoStorage: string }) => { const d = { id: 'novo', enviadoEm: '2026-11-01', ...doc }; if ('contratoId' in alvo) contratos[0]!.documentos.push(d); return d })
const removerDocumento = vi.fn(async (id: string) => { contratos[0]!.documentos = contratos[0]!.documentos.filter(d => d.id !== id) })
vi.mock('@/lib/repositorio', async (orig) => ({
  ...(await orig() as object),
  repositorio: {
    obterImovel: async (id: string) => imoveis.find(i => i.id === id) ?? null,
    obterContrato: async (id: string) => contratos.find(c => c.id === id) ?? null,
    obterContratoPorImovel: async (id: string) => contratos.find(c => c.imovelId === id && !c.contratoPaiId) ?? null,
    listarVinculados: async (id: string) => contratos.filter(c => c.contratoPaiId === id),
    listarContratos: async () => contratos, listarImoveis: async () => imoveis,
    atualizarContrato: (id: string, d: Record<string, unknown>) => atualizarContrato(id, d),
    encerrarContrato: (id: string, m: string) => encerrarContrato(id, m),
    anexarDocumento: (a: object, d: { tipo: string; nome: string; caminhoStorage: string }) => anexarDocumento(a, d),
    removerDocumento: (id: string) => removerDocumento(id),
    atualizarTextoContrato: async () => undefined,
  },
}))
const analisarContrato = vi.fn(async (_c: object, _i: object, _o?: string) => ({ resumo: 'Locação residencial por 30 meses com caução.', clausulasRisco: [{ titulo: 'Multa de 3 aluguéis', gravidade: 'alta' as const, observacao: 'Acima do usual.', trecho: 'multa de três aluguéis', pagina: 4 }], prazos: [{ descricao: 'Reajuste anual', data: '01/11/2026' }], sugestoes: ['Reduzir a multa.'] }))
vi.mock('@/lib/agente', () => ({ ultimaAnalise: async () => null, analisarContrato: (c: object, i: object, o?: string) => analisarContrato(c, i, o) }))
const enviarArquivo = vi.fn(async (a: File, pasta: string) => `${pasta}/${a.name}`)
const apagarArquivo = vi.fn(async (_c?: string) => undefined)
vi.mock('@/lib/arquivos', () => ({ enviarArquivo: (a: File, p: string) => enviarArquivo(a, p), urlAssinada: async (c: string) => `https://arquivos/${c}`, apagarArquivo: (c?: string) => apagarArquivo(c) }))
vi.mock('@/components/BotaoAuditar', () => ({ default: ({ id }: { id: string }) => <span data-testid={`auditar-${id}`} /> }))
vi.mock('@/components/Reajuste', () => ({ default: () => <div data-testid="reajuste-stub" /> }))
vi.mock('@/components/ZonaArrastar', () => ({ default: ({ onArquivo }: { onArquivo: (a: File, t: string) => void }) => <div>
  <button data-testid="zona-pequeno" onClick={() => onArquivo(new File(['laudo'], 'laudo.txt', { type: 'text/plain' }), 'laudo_vistoria')}>pequeno</button>
  <button data-testid="zona-grande" onClick={() => { const f = new File(['x'], 'grande.pdf', { type: 'application/pdf' }); Object.defineProperty(f, 'size', { value: 51 * 1024 * 1024 }); onArquivo(f, 'contrato') }}>grande</button>
</div> }))
vi.mock('@/components/Layout', () => ({ default: ({ title, children }: { title: string; children: React.ReactNode }) => <div><h1>{title}</h1>{children}</div> }))
const { default: ContratoPage } = await import('./ContratoPage')
const Onde = () => <p data-testid="onde">{useLocation().pathname}</p>
const montar = (id: string) => render(<MemoryRouter initialEntries={[`/contrato/${id}`]}><Routes><Route path="/contrato/:id" element={<><ContratoPage /><Onde /></>} /><Route path="*" element={<Onde />} /></Routes></MemoryRouter>)
const secao = (id: string) => document.querySelector(`section[aria-labelledby="${id}"]`) as HTMLElement
const texto = (s: string | null | undefined) => (s ?? '').replace(/ /g, ' ')

describe('Contrato', () => {
  beforeEach(() => {
    cleanup(); reset(); atualizarContrato.mockClear(); encerrarContrato.mockClear(); anexarDocumento.mockClear(); removerDocumento.mockClear(); analisarContrato.mockClear(); enviarArquivo.mockClear(); apagarArquivo.mockClear()
    window.print = vi.fn(); window.open = vi.fn(() => aba as unknown as Window); window.confirm = vi.fn(() => true)
    Object.assign(navigator, { clipboard: { writeText: vi.fn(async (_t: string) => undefined) } })
  })

  it('mostra o contrato vigente, documentos (PDF do instrumento + anexos), compromissos, aditivo com ida ao vínculo e resumo copiado; trata imóvel sem contrato, não encontrado e link pelo id do contrato', async () => {
    montar('i1')
    await waitFor(() => expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Rua das Flores 123'))
    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe('Ana Locatária')
    expect(screen.getByText('A renovar')).toBeTruthy()
    expect(texto(screen.getByText('Valor').nextElementSibling!.textContent)).toBe('R$ 3.500,00')
    expect(screen.getByText('Chaves com o porteiro')).toBeTruthy()
    expect(screen.getByTestId('reajuste-stub')).toBeTruthy()
    await waitFor(() => expect(secao('titulo-documentos').querySelector('h3')!.textContent).toBe('Documentos (2)'))
    expect(within(secao('titulo-documentos')).getByText('instrumento.pdf')).toBeTruthy()
    expect(screen.queryByLabelText('Excluir instrumento.pdf')).toBeNull()
    expect(screen.getByLabelText('Excluir Contrato assinado.pdf')).toBeTruthy()
    expect(screen.getByTestId('auditar-cd1')).toBeTruthy()
    await waitFor(() => expect(secao('titulo-compromissos')).toBeTruthy())
    expect(within(secao('titulo-compromissos')).getByText(/Vencimento/)).toBeTruthy()
    expect(secao('titulo-vinculados').querySelector('h3')!.textContent).toBe('Aditivos e subcontratos (1)')
    fireEvent.click(screen.getByTestId('copiar-contrato'))
    const copiado = (navigator.clipboard.writeText as ReturnType<typeof vi.fn>).mock.calls[0]![0] as string
    expect(copiado).toContain('Imóvel: Rua das Flores 123')
    expect(copiado).toContain('Situação: A renovar')
    fireEvent.click(screen.getByTestId('imprimir-contrato'))
    expect(window.print).toHaveBeenCalled()
    fireEvent.click(within(secao('titulo-vinculados')).getByText('Aditivo', { selector: 'span' }).closest('button')!)
    expect(screen.getByTestId('onde').textContent).toBe('/contrato/vinculo/c2')
    cleanup(); montar('i2')
    await waitFor(() => expect(screen.getByText('Este imóvel ainda não possui contrato cadastrado.')).toBeTruthy())
    expect((screen.getByText('Cadastrar contrato') as HTMLAnchorElement).getAttribute('href')).toBe('/contrato/novo?imovelId=i2')
    cleanup(); montar('nao-existe')
    await waitFor(() => expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Imóvel não encontrado'))
    fireEvent.click(screen.getByText('Voltar para imóveis'))
    expect(screen.getByTestId('onde').textContent).toBe('/imoveis')
    cleanup(); montar('c1')
    await waitFor(() => expect(screen.getByTestId('onde').textContent).toBe('/contrato/i1'))
    await waitFor(() => expect(screen.getByRole('heading', { level: 2 }).textContent).toBe('Ana Locatária'))
  })

  it('edita com validação de parte e valor, salva e recarrega; encerra com motivo obrigatório e some dos botões', async () => {
    montar('i1')
    await waitFor(() => expect(screen.getByRole('heading', { level: 2 }).textContent).toBe('Ana Locatária'))
    fireEvent.click(screen.getByText('Editar'))
    const grupo = screen.getByRole('group', { name: 'Editar contrato' })
    expect((within(grupo).getByLabelText('Outra parte') as HTMLInputElement).value).toBe('Ana Locatária')
    expect((within(grupo).getByLabelText(/Valor mensal/) as HTMLInputElement).value).toBe('3500')
    fireEvent.change(within(grupo).getByLabelText('Outra parte'), { target: { value: '  ' } })
    fireEvent.click(screen.getByText('Salvar alterações'))
    expect(within(grupo).getByRole('alert').textContent).toContain('Informe o nome ou empresa da outra parte')
    fireEvent.change(within(grupo).getByLabelText('Outra parte'), { target: { value: 'Ana Nova' } })
    fireEvent.change(within(grupo).getByLabelText(/Valor mensal/), { target: { value: 'abc' } })
    fireEvent.click(screen.getByText('Salvar alterações'))
    expect(within(grupo).getByRole('alert').textContent).toContain('Valor inválido')
    expect(atualizarContrato).not.toHaveBeenCalled()
    fireEvent.change(within(grupo).getByLabelText(/Valor mensal/), { target: { value: '4.250,50' } })
    fireEvent.click(within(grupo).getByRole('button', { name: '3 dias' }))
    fireEvent.change(within(grupo).getByLabelText('Observações'), { target: { value: 'Reajuste combinado' } })
    fireEvent.click(screen.getByText('Salvar alterações'))
    await waitFor(() => expect(screen.getByRole('status').textContent).toBe('Contrato atualizado.'))
    expect(atualizarContrato).toHaveBeenCalledWith('c1', expect.objectContaining({ parte: 'Ana Nova', valor: 4250.5, notas: 'Reajuste combinado', avisosDias: [7, 3] }))
    await waitFor(() => expect(screen.getByRole('heading', { level: 2 }).textContent).toBe('Ana Nova'))
    expect(texto(screen.getByText('Valor').nextElementSibling!.textContent)).toBe('R$ 4.250,50')
    fireEvent.click(screen.getByText('Encerrar'))
    const confirmar = screen.getByRole('button', { name: /encerr/i }) as HTMLButtonElement
    expect(confirmar.disabled).toBe(true)
    fireEvent.click(screen.getByRole('radio', { name: /^Rescisão amigável/ }))
    expect(confirmar.disabled).toBe(false)
    fireEvent.click(confirmar)
    await waitFor(() => expect(screen.getByRole('status').textContent).toBe('Contrato encerrado. Ele deixa de gerar alertas e sai dos indicadores.'))
    expect(encerrarContrato).toHaveBeenCalledWith('c1', 'Rescisão amigável')
    await waitFor(() => expect(screen.getByText('Encerrado em 01/11/2026')).toBeTruthy())
    expect(screen.getByText(/Motivo: Rescisão amigável\./)).toBeTruthy()
    expect(screen.queryByText('Editar')).toBeNull()
    expect(screen.queryByTestId('reajuste-stub')).toBeNull()
  })

  it('anexa documento (limite de 50 MB), abre e exclui anexos, e roda a análise jurídica com resultado e erro', async () => {
    montar('i1')
    await waitFor(() => expect(secao('titulo-documentos').querySelector('h3')!.textContent).toBe('Documentos (2)'))
    fireEvent.click(screen.getByTestId('zona-grande'))
    expect(screen.getByRole('alert').textContent).toBe('O arquivo excede 50 MB. Reduza o tamanho e tente novamente.')
    expect(enviarArquivo).not.toHaveBeenCalled()
    fireEvent.click(screen.getByTestId('zona-pequeno'))
    await waitFor(() => expect(screen.getByRole('status').textContent).toBe('“laudo.txt” adicionado.'))
    expect(enviarArquivo).toHaveBeenCalledWith(expect.any(File), 'contratos/c1')
    expect(anexarDocumento).toHaveBeenCalledWith({ contratoId: 'c1' }, { tipo: 'laudo_vistoria', nome: 'laudo.txt', caminhoStorage: 'contratos/c1/laudo.txt' })
    await waitFor(() => expect(secao('titulo-documentos').querySelector('h3')!.textContent).toBe('Documentos (3)'))
    expect(within(secao('titulo-documentos')).getByText('laudo.txt')).toBeTruthy()
    fireEvent.click(screen.getByLabelText('Abrir Contrato assinado.pdf'))
    await waitFor(() => expect(aba.location.href).toBe('https://arquivos/contratos/c1/assinado.pdf'))
    fireEvent.click(screen.getByLabelText('Excluir Contrato assinado.pdf'))
    expect(window.confirm).toHaveBeenCalledWith('Excluir “Contrato assinado.pdf”? Esta ação não pode ser desfeita.')
    await waitFor(() => expect(removerDocumento).toHaveBeenCalledWith('cd1'))
    expect(apagarArquivo).toHaveBeenCalledWith('contratos/c1/assinado.pdf')
    await waitFor(() => expect(secao('titulo-documentos').querySelector('h3')!.textContent).toBe('Documentos (2)'))
    fireEvent.click(screen.getByText('Analisar contrato'))
    await waitFor(() => expect(screen.getByText('Locação residencial por 30 meses com caução.')).toBeTruthy())
    expect(analisarContrato).toHaveBeenCalledWith(expect.objectContaining({ id: 'c1' }), expect.objectContaining({ id: 'i1' }), 'botao')
    expect(screen.getByText(/Multa de 3 aluguéis/).textContent).toContain('(Alta)')
    expect(screen.getByText('Reajuste anual — 01/11/2026')).toBeTruthy()
    expect(screen.getByText('Reduzir a multa.')).toBeTruthy()
    // D07: trecho literal citado e PDF aberto na página apontada; sem pares do mesmo tipo não há mediana.
    expect(screen.getByTestId('trecho-clausula').textContent).toContain('multa de três aluguéis')
    fireEvent.click(screen.getByTestId('abrir-pagina'))
    await waitFor(() => expect(aba.location.href).toBe('https://arquivos/contratos/c1/instrumento.pdf#page=4'))
    expect(screen.queryByTestId('mediana-carteira')).toBeNull()
    expect(screen.getByText(/Última análise:/)).toBeTruthy()
    analisarContrato.mockRejectedValueOnce(new Error('Chave da IA não configurada'))
    fireEvent.click(screen.getByText('Analisar novamente'))
    await waitFor(() => expect(screen.getByText(/Não foi possível analisar agora: Chave da IA não configurada/)).toBeTruthy())
  })
})
