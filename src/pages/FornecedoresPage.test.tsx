// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup, within } from '@testing-library/react'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'

const mes = new Date().toISOString().slice(0, 7)
let lista: object[] = []
const salvarFornecedor = vi.fn(async (_f: object, _r: string) => undefined)
vi.mock('@/lib/fornecedores', async () => {
  const real = await vi.importActual<typeof import('@/lib/fornecedores')>('@/lib/fornecedores')
  return { ...real, listarFornecedores: async () => lista, salvarFornecedor: (f: object, r: string) => salvarFornecedor(f, r), novoIdLocal: () => 'novo-1' }
})
vi.mock('@/hooks/useImoveis', () => ({ useImoveis: () => ({ imoveis: [{ id: 'i1', endereco: 'Rua das Flores 123', cidade: 'Rio de Janeiro' }, { id: 'i2', endereco: 'Av. Atlântica 500', cidade: 'Rio de Janeiro' }], loading: false }) }))
vi.mock('@/components/Layout', () => ({ default: ({ title, children }: { title: string; children: React.ReactNode }) => <div><h1>{title}</h1>{children}</div> }))
const { default: FornecedoresPage } = await import('./FornecedoresPage')
const Onde = () => <p data-testid="onde">{useLocation().pathname}</p>
const montar = () => render(<MemoryRouter><Routes><Route path="*" element={<><FornecedoresPage /><Onde /></>} /></Routes></MemoryRouter>)
const kycOk = { consultadoEm: '2026-10-01', situacao: 'ATIVA', ceis: 'limpo', cnep: 'limpo' }
const certOk = [{ id: 'c1', nome: 'CND federal', validade: '2027-12-31' }]
const sla = (id: string, valores: number[]) => ({ id, descricao: 'Atendimento em 24h', unidade: '%', meta: 90, sentido: 'minimo', medicoes: valores.map((v, i) => ({ mes: i === 0 ? mes : `${mes.slice(0, 4)}-0${i}`, valor: v })) })

describe('Fornecedores', () => {
  beforeEach(() => { cleanup(); localStorage.clear(); salvarFornecedor.mockClear()
    lista = [
      { id: 'f1', nome: 'Zeta Limpeza', cnpj: '10945994000172', categoria: 'limpeza', imovelIds: ['i1'], kyc: kycOk, certidoes: certOk, slas: [sla('s1', [95])], notas: '' },
      { id: 'f2', nome: 'Alfa Segurança', cnpj: '11222333000181', categoria: 'seguranca', imovelIds: [], kyc: { ceis: 'nao_verificado', cnep: 'nao_verificado' }, certidoes: [], slas: [], notas: '' },
      { id: 'f3', nome: 'Beta Elevadores', cnpj: '33444555000166', categoria: 'elevadores', imovelIds: [], kyc: { ...kycOk, ceis: 'sancionado' }, certidoes: certOk, slas: [sla('s3', [70])], notas: '' },
    ] })

  it('lista por nome com KYC e SLA, alertas de quem está irregular, busca sem acento lembrada e contador', async () => {
    montar()
    await waitFor(() => expect(screen.getByTestId('contador-fornecedores').textContent).toContain('Mostrando 3 de 3 fornecedor(es).'))
    const cartoes = () => screen.getAllByRole('button', { name: / - / }).map(b => b.getAttribute('aria-label'))
    expect(cartoes()).toEqual(['Alfa Segurança - Segurança e portaria', 'Beta Elevadores - Elevadores e equipamentos', 'Zeta Limpeza - Limpeza e conservação'])
    expect(within(screen.getByRole('button', { name: 'Alfa Segurança - Segurança e portaria' })).getByText('Com pendências')).toBeTruthy()
    expect(within(screen.getByRole('button', { name: 'Alfa Segurança - Segurança e portaria' })).getByText('Sem metas')).toBeTruthy()
    expect(within(screen.getByRole('button', { name: 'Beta Elevadores - Elevadores e equipamentos' })).getByText('Irregular')).toBeTruthy()
    expect(screen.getByTestId('sla-f1').textContent).toBe('100% cumprido')
    expect(screen.getByTestId('sla-f3').textContent).toBe('0% cumprido')
    expect(screen.getByText('1 meta(s) descumprida(s)')).toBeTruthy()
    const alertas = screen.getByRole('region', { name: 'Alertas de fornecedores' })
    expect(alertas.textContent).toContain('Beta Elevadores — Consta no CEIS (sanção)')
    expect(alertas.textContent).toContain('SLA descumprido: Atendimento em 24h')
    fireEvent.change(screen.getByTestId('busca-fornecedores'), { target: { value: 'seguranca' } })
    expect(cartoes()).toEqual(['Alfa Segurança - Segurança e portaria'])
    expect(screen.getByTestId('contador-fornecedores').textContent).toContain('Mostrando 1 de 3')
    expect(localStorage.getItem('lsm-fornecedores-busca')).toBe('seguranca')
  })

  it('ranking por SLA (sem medição no fim) e por metas descumpridas, ordem lembrada; clicar abre o fornecedor; copiar lista e baixar CSV', async () => {
    const write = vi.fn(async (_t: string) => undefined); Object.assign(navigator, { clipboard: { writeText: write } })
    URL.createObjectURL = vi.fn(() => 'blob:x'); URL.revokeObjectURL = vi.fn()
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined)
    montar()
    await waitFor(() => expect(screen.getByTestId('contador-fornecedores')).toBeTruthy())
    fireEvent.change(screen.getByTestId('ordem-fornecedores'), { target: { value: 'sla' } })
    expect(localStorage.getItem('lsm-fornecedores-ordem')).toBe('sla')
    const nomes = () => screen.getAllByRole('heading', { level: 3 }).map(h => h.textContent)
    expect(nomes()).toEqual(['Zeta Limpeza', 'Beta Elevadores', 'Alfa Segurança'])
    expect(screen.getAllByTestId('posicao-sla').map(p => p.textContent)).toEqual(['1º · ', '2º · '])
    fireEvent.change(screen.getByTestId('ordem-fornecedores'), { target: { value: 'descumpridas' } })
    expect(nomes()[0]).toBe('Beta Elevadores')
    fireEvent.click(screen.getByTestId('copiar-fornecedores'))
    await waitFor(() => expect(screen.getByTestId('copiar-fornecedores').textContent).toBe('lista copiada'))
    expect(write.mock.calls[0][0]).toContain('Fornecedores — 3 de 3')
    expect(write.mock.calls[0][0]).toContain('1. Beta Elevadores · 33.444.555/0001-66 · Elevadores e equipamentos · SLA 0%')
    fireEvent.click(screen.getByTestId('baixar-fornecedores'))
    expect(click).toHaveBeenCalled(); expect(screen.getByTestId('baixar-fornecedores').textContent).toBe('baixado')
    fireEvent.click(screen.getByRole('button', { name: 'Zeta Limpeza - Limpeza e conservação' }))
    expect(screen.getByTestId('onde').textContent).toBe('/fornecedor/f1')
    click.mockRestore()
  })

  it('cadastro valida nome, CNPJ e tipo; grava com imóveis marcados e abre a ficha; lista vazia', async () => {
    montar()
    await waitFor(() => expect(screen.getByTestId('contador-fornecedores')).toBeTruthy())
    fireEvent.click(screen.getByText('Novo fornecedor'))
    fireEvent.click(screen.getByText('Cadastrar e abrir'))
    expect(screen.getByRole('alert').textContent).toBe('Informe o nome do fornecedor.')
    fireEvent.change(screen.getByLabelText('Nome do fornecedor'), { target: { value: 'Ômega Manutenção' } })
    fireEvent.change(screen.getByLabelText('CNPJ'), { target: { value: '12.345.678/0001-00' } })
    fireEvent.click(screen.getByText('Cadastrar e abrir'))
    expect(screen.getByRole('alert').textContent).toBe('O CNPJ informado não é válido. Confira os 14 dígitos.')
    fireEvent.change(screen.getByLabelText('CNPJ'), { target: { value: '10.945.994/0001-72' } })
    fireEvent.click(screen.getByText('Cadastrar e abrir'))
    expect(screen.getByRole('alert').textContent).toBe('Escolha o tipo de serviço.')
    fireEvent.click(within(screen.getByRole('radiogroup', { name: 'Tipo de serviço' })).getByLabelText(/Manutenção predial/))
    fireEvent.click(screen.getByLabelText('Av. Atlântica 500, Rio de Janeiro'))
    fireEvent.click(screen.getByText('Cadastrar e abrir'))
    await waitFor(() => expect(screen.getByTestId('onde').textContent).toBe('/fornecedor/novo-1'))
    expect(salvarFornecedor).toHaveBeenCalledWith(expect.objectContaining({ id: 'novo-1', nome: 'Ômega Manutenção', cnpj: '10945994000172', categoria: 'manutencao', imovelIds: ['i2'], kyc: { ceis: 'nao_verificado', cnep: 'nao_verificado' } }), 'Fornecedor cadastrado: Ômega Manutenção')
    cleanup(); lista = []
    montar()
    await waitFor(() => expect(screen.getByText('Nenhum fornecedor cadastrado')).toBeTruthy())
    expect(screen.queryByTestId('contador-fornecedores')).toBeNull()
  })
})
