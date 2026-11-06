// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup, within } from '@testing-library/react'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'
import { emDias } from '@/lib/datas'

let imovel: object | null = { id: 'i1', endereco: 'Rua das Flores 123', uso: 'locado' }
const criarContrato = vi.fn(async (_d: object) => ({ id: 'c1' }))
const enviarArquivo = vi.fn(async (_a: File, _p: string) => 'contratos/i1/x.pdf')
vi.mock('@/lib/repositorio', () => ({ repositorio: { obterImovel: async () => imovel, listarImoveis: async () => [{ id: 'i1', endereco: 'Rua das Flores 123', proprietario: 'Ana' }, { id: 'i2', endereco: 'Av. Central 9', proprietario: 'Bia' }], criarContrato: (d: object) => criarContrato(d) } }))
vi.mock('@/lib/arquivos', () => ({ enviarArquivo: (a: File, p: string) => enviarArquivo(a, p) }))
vi.mock('@/lib/pdf', () => ({ extrairTextoPdf: async () => 'CONTRATO DE LOCAÇÃO texto lido' }))
vi.mock('@/components/ZonaArrastar', () => ({ default: ({ onArquivo }: { onArquivo: (a: File) => void }) => <button type="button" data-testid="zona-stub" onClick={() => onArquivo(new File(['%PDF'], 'contrato.pdf', { type: 'application/pdf' }))}>anexar pdf</button> }))
vi.mock('@/components/Layout', () => ({ default: ({ title, children }: { title: string; children: React.ReactNode }) => <div><h1>{title}</h1>{children}</div> }))
const { default: NovoContratoPage } = await import('./NovoContratoPage')
const Onde = () => <p data-testid="onde">{useLocation().pathname}{useLocation().search}</p>
const montar = (rota: string) => render(<MemoryRouter initialEntries={[rota]}><Routes><Route path="*" element={<><NovoContratoPage /><Onde /></>} /></Routes></MemoryRouter>)
const continuar = () => screen.getByRole('button', { name: /Continuar|Concluir|Salvando/ }) as HTMLButtonElement
const escolher = (grupo: string, rotulo: string) => fireEvent.click(within(screen.getByRole('radiogroup', { name: grupo })).getByLabelText(new RegExp('^' + rotulo)))
const preencher = (id: string, v: string) => fireEvent.change(document.getElementById(id)!, { target: { value: v } })

describe('Novo contrato (assistente em 5 etapas)', () => {
  beforeEach(() => { cleanup(); criarContrato.mockClear(); enviarArquivo.mockClear(); imovel = { id: 'i1', endereco: 'Rua das Flores 123', uso: 'locado' } })

  it('sem imóvel pede a escolha na própria tela (D23); imóvel locado oferece só os tipos de locação; cada etapa só avança preenchida', async () => {
    montar('/contratos/novo')
    await waitFor(() => expect(screen.getByTestId('imovel-escolha')).toBeTruthy())
    fireEvent.change(screen.getByTestId('imovel-escolha'), { target: { value: 'i2' } })
    fireEvent.click(screen.getByTestId('imovel-continuar'))
    await waitFor(() => expect(screen.getByTestId('onde').textContent).toBe('/contrato/novo?imovelId=i2'))
    cleanup(); montar('/contratos/novo?imovelId=i1')
    await waitFor(() => expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Novo contrato — Rua das Flores 123'))
    const opcoes = within(screen.getByRole('radiogroup', { name: 'tipo' })).getAllByRole('radio').length
    expect(opcoes).toBe(5)
    expect(screen.queryByLabelText(/^Comodato/)).toBeNull()
    expect(continuar().disabled).toBe(true)
    escolher('tipo', 'Locação comercial'); fireEvent.click(continuar())
    expect(screen.getByText('Datas e partes')).toBeTruthy(); expect(continuar().disabled).toBe(true)
    expect((document.getElementById('dataInicio') as HTMLInputElement).value).toBe(emDias(0))
    expect((document.getElementById('dataVencimento') as HTMLInputElement).value).toBe(emDias(365))
    preencher('parte', 'Loja Centro Ltda'); expect(continuar().disabled).toBe(false); fireEvent.click(continuar())
    expect(screen.getByText('Valor e periodicidade')).toBeTruthy(); expect(continuar().disabled).toBe(true)
    preencher('valor', '3500'); expect(continuar().disabled).toBe(false)
  })

  it('fluxo completo com PDF anexado grava o contrato e abre a análise', async () => {
    montar('/contratos/novo?imovelId=i1')
    await waitFor(() => expect(screen.getByRole('radiogroup', { name: 'tipo' })).toBeTruthy())
    escolher('tipo', 'Locação residencial'); fireEvent.click(continuar())
    preencher('parte', 'Ana Lima'); preencher('dataInicio', '2026-12-01'); preencher('dataVencimento', '2029-11-30'); fireEvent.click(continuar())
    preencher('valor', '2500.5'); preencher('periodicidade', 'mensal'); preencher('indice', 'igpm'); fireEvent.click(continuar())
    expect(screen.getByText('Garantia')).toBeTruthy()
    escolher('garantia', 'Fiador'); fireEvent.click(continuar())
    expect(screen.getByText('Confirmação')).toBeTruthy()
    expect(screen.getByText('01/12/2026 a 30/11/2029')).toBeTruthy()
    expect(screen.getByText(/R\$ 2\.500,50 mensal/)).toBeTruthy()
    fireEvent.click(screen.getByTestId('zona-stub'))
    await waitFor(() => expect(screen.getByText('Anexado: contrato.pdf — conteúdo lido para a análise')).toBeTruthy())
    fireEvent.click(continuar())
    await waitFor(() => expect(screen.getByTestId('onde').textContent).toBe('/contrato/i1?analisar=1'))
    expect(enviarArquivo).toHaveBeenCalledWith(expect.any(File), 'contratos/i1')
    expect(criarContrato).toHaveBeenCalledWith(expect.objectContaining({ imovelId: 'i1', natureza: 'principal', tipo: 'locacao_residencial', parte: 'Ana Lima', dataInicio: '2026-12-01', dataVencimento: '2029-11-30', valor: 2500.5, periodicidade: 'mensal', indice: 'igpm', garantia: 'fiador', textoExtraido: 'CONTRATO DE LOCAÇÃO texto lido', arquivo: { nome: 'contrato.pdf', tamanho: 4, caminhoStorage: 'contratos/i1/x.pdf' } }))
  })

  it('aditivo de um contrato-mãe leva paiId e natureza, sem análise; erro ao gravar avisa; voltar na primeira etapa volta à lista', async () => {
    window.alert = vi.fn()
    criarContrato.mockRejectedValueOnce(new Error('sem permissão'))
    montar('/contratos/novo?imovelId=i1&paiId=c0&natureza=aditivo')
    await waitFor(() => expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Novo aditivo — Rua das Flores 123'))
    escolher('tipo', 'Locação comercial'); fireEvent.click(continuar())
    preencher('parte', 'Loja Centro'); fireEvent.click(continuar())
    preencher('valor', '0'); fireEvent.click(continuar())
    fireEvent.click(continuar())
    fireEvent.click(continuar())
    await waitFor(() => expect(window.alert).toHaveBeenCalledWith('Erro ao criar contrato: sem permissão'))
    expect(criarContrato).toHaveBeenCalledWith(expect.objectContaining({ contratoPaiId: 'c0', natureza: 'aditivo', valor: 0, garantia: 'sem_garantia', arquivo: undefined, textoExtraido: undefined }))
    fireEvent.click(continuar())
    await waitFor(() => expect(screen.getByTestId('onde').textContent).toBe('/contrato/i1'))
    cleanup(); montar('/contratos/novo?imovelId=i1')
    await waitFor(() => expect(screen.getByText('Voltar')).toBeTruthy())
    fireEvent.click(screen.getByText('Voltar'))
    expect(screen.getByTestId('onde').textContent).toBe('/imoveis')
  })
})
