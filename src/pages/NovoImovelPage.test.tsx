// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup, within } from '@testing-library/react'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'

const criarImovel = vi.fn(async (_i: object): Promise<void> => undefined)
const enviarArquivo = vi.fn(async (_a: File, _p: string) => 'imoveis/123-laudo.pdf')
vi.mock('@/lib/repositorio', () => ({ repositorio: { criarImovel: (i: object) => criarImovel(i) } }))
vi.mock('@/lib/arquivos', () => ({ enviarArquivo: (a: File, p: string) => enviarArquivo(a, p) }))
vi.mock('@/components/ZonaArrastar', () => ({ default: ({ onArquivo }: { onArquivo: (a: File, t: string) => void }) => <button type="button" data-testid="zona-stub" onClick={() => onArquivo(new File(['x'], 'laudo.pdf'), 'laudo')}>anexar laudo</button> }))
vi.mock('@/components/Layout', () => ({ default: ({ title, children }: { title: string; children: React.ReactNode }) => <div><h1>{title}</h1>{children}</div> }))
const { default: NovoImovelPage } = await import('./NovoImovelPage')
const Onde = () => <p data-testid="onde">{useLocation().pathname}</p>
const montar = () => render(<MemoryRouter initialEntries={['/imoveis/novo']}><Routes><Route path="*" element={<><NovoImovelPage /><Onde /></>} /></Routes></MemoryRouter>)
const continuar = () => screen.getByRole('button', { name: /Continuar|Concluir|Salvando/ }) as HTMLButtonElement
const escolher = (grupo: string, rotulo: string) => fireEvent.click(within(screen.getByRole('radiogroup', { name: grupo })).getByLabelText(new RegExp('^' + rotulo)))
const preencher = (id: string, v: string) => fireEvent.change(document.getElementById(id)!, { target: { value: v } })

describe('Novo imóvel (assistente em 6 etapas)', () => {
  beforeEach(() => { cleanup(); criarImovel.mockClear(); enviarArquivo.mockClear() })

  it('cada etapa só libera Continuar quando preenchida; a lista de documentos depende de tipo, uso e UF', () => {
    montar()
    expect(screen.getByText('Qual é o tipo de imóvel?')).toBeTruthy()
    expect(continuar().disabled).toBe(true)
    escolher('tipo', 'Loja'); expect(continuar().disabled).toBe(false); fireEvent.click(continuar())
    expect(screen.getByText('Como o imóvel é ocupado?')).toBeTruthy(); expect(continuar().disabled).toBe(true)
    escolher('uso', 'Locado'); fireEvent.click(continuar())
    expect(screen.getByText('Onde fica o imóvel?')).toBeTruthy()
    escolher('uf', 'Rio de Janeiro'); fireEvent.click(continuar())
    expect(screen.getByText('Dados principais')).toBeTruthy(); expect(continuar().disabled).toBe(true)
    preencher('endereco', 'Av. Atlântica 500'); preencher('cidade', 'Rio de Janeiro'); preencher('proprietario', 'Maria Souza')
    expect(continuar().disabled).toBe(true)
    preencher('matricula', '222'); expect(continuar().disabled).toBe(false); fireEvent.click(continuar())
    expect(screen.getByText('Documentos do imóvel')).toBeTruthy()
    const itens = screen.getAllByRole('checkbox')
    const rotulos = itens.map(c => c.closest('label')!.textContent)
    expect(rotulos.some(r => r!.includes('Matrícula do RGI'))).toBe(true)
    expect(rotulos.some(r => r!.includes('Certificado de Aprovação do CBMERJ'))).toBe(true)
    expect(rotulos.some(r => r!.includes('Alvará de funcionamento') && r!.includes('obrigatório'))).toBe(true)
  })

  it('voltar refaz etapas e na primeira volta à lista; confirmação resume os dados e conclui gravando documentos marcados e extras enviados', async () => {
    montar()
    fireEvent.click(screen.getByText('Voltar'))
    expect(screen.getByTestId('onde').textContent).toBe('/imoveis')
    cleanup(); montar()
    escolher('tipo', 'Apartamento'); fireEvent.click(continuar())
    escolher('uso', 'Locado'); fireEvent.click(continuar())
    escolher('uf', 'São Paulo'); fireEvent.click(continuar())
    fireEvent.click(screen.getByText('Voltar'))
    expect(screen.getByText('Onde fica o imóvel?')).toBeTruthy(); fireEvent.click(continuar())
    preencher('endereco', 'Rua das Flores 123'); preencher('cidade', 'São Paulo'); preencher('proprietario', 'João Silva'); preencher('matricula', '111'); preencher('area', '80'); preencher('notas', 'vaga 12')
    fireEvent.click(continuar())
    fireEvent.click(screen.getByLabelText(/Matrícula do RGI/))
    fireEvent.click(screen.getByTestId('zona-stub'))
    expect(screen.getByText('laudo.pdf')).toBeTruthy()
    fireEvent.click(continuar())
    expect(screen.getByText('Confirmação')).toBeTruthy()
    expect(screen.getByText('Rua das Flores 123, São Paulo — SP')).toBeTruthy()
    expect(screen.getByText('1 de 7 necessários + 1 extras')).toBeTruthy()
    fireEvent.click(continuar())
    await waitFor(() => expect(screen.getByTestId('onde').textContent).toBe('/imoveis'))
    expect(enviarArquivo).toHaveBeenCalledWith(expect.any(File), 'imoveis')
    expect(criarImovel).toHaveBeenCalledWith({ endereco: 'Rua das Flores 123', cidade: 'São Paulo', uf: 'SP', tipo: 'apartamento', uso: 'locado', proprietario: 'João Silva', matricula: '111', areaM2: 80, notas: 'vaga 12', documentos: [{ tipo: 'matricula_rgi', nome: 'Matrícula do RGI' }, { tipo: 'laudo', nome: 'laudo.pdf', tamanho: 1, caminhoStorage: 'imoveis/123-laudo.pdf' }] })
  })

  it('erro ao gravar aparece como alerta e mantém a confirmação', async () => {
    criarImovel.mockRejectedValueOnce(new Error('sem permissão'))
    montar()
    escolher('tipo', 'Casa'); fireEvent.click(continuar()); escolher('uso', 'Uso próprio'); fireEvent.click(continuar()); escolher('uf', 'Minas Gerais'); fireEvent.click(continuar())
    preencher('endereco', 'Rua B 9'); preencher('cidade', 'Juiz de Fora'); preencher('proprietario', 'Carlos'); preencher('matricula', '333'); fireEvent.click(continuar())
    fireEvent.click(continuar()); fireEvent.click(continuar())
    await waitFor(() => expect(screen.getByRole('alert').textContent).toBe('Erro ao criar imóvel: sem permissão'))
    expect(screen.getByText('Confirmação')).toBeTruthy()
    expect(screen.getByTestId('onde').textContent).toBe('/imoveis/novo')
    expect(criarImovel).toHaveBeenCalledWith(expect.objectContaining({ areaM2: undefined, documentos: [] }))
  })
})
