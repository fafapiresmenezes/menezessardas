// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

let historico: object[] = []
const invoke = vi.fn(async (_f: string, _o?: object): Promise<{ data: unknown; error: unknown }> => ({ data: null, error: null }))
vi.mock('@/lib/supabase', () => ({
  supabaseConfigurado: true,
  supabase: { from: () => ({ select: () => ({ order: () => ({ limit: async () => ({ data: historico }) }) }) }), functions: { invoke: (f: string, o?: object) => invoke(f, o) } },
}))
vi.mock('@/components/Layout', () => ({ default: ({ title, children }: { title: string; children: React.ReactNode }) => <div><h1>{title}</h1>{children}</div> }))
const { default: KycPage } = await import('./KycPage')

const resultado = { cnpj: '10945994000172', risco: 'baixo', alertas: [], receita: { ok: true, encontrado: true, nome: 'EMPRESA X LTDA', fantasia: 'X', situacao: 'ATIVA', abertura: '2010-01-05', atividade: 'Consultoria', municipio: 'Rio de Janeiro', uf: 'RJ', socios: [{ nome: 'Ana', qualificacao: 'Sócia' }] }, certidoes: { ok: true, certidoes: [{ emissor: 'TCU', cadastro: 'CEIS', situacao: 'NADA_CONSTA', descricao: 'Inidôneos' }] }, conflitos: [], fontes: ['Receita Federal', 'TCU'], consultadoEm: '2026-11-02T12:00:00Z', proximaEm: '2027-01-31' }
describe('Checagem de contraparte (KYC)', () => {
  beforeEach(() => { cleanup(); invoke.mockReset().mockImplementation(async () => ({ data: null, error: null })); localStorage.clear(); historico = [] })

  it('botão só habilita com 14 dígitos; CNPJ lembrado; resultado mostra risco, Receita, sanções e conflito; copiar para o parecer', async () => {
    const write = vi.fn(async (_t: string) => undefined); Object.assign(navigator, { clipboard: { writeText: write } })
    invoke.mockResolvedValueOnce({ data: resultado, error: null })
    render(<MemoryRouter><KycPage /></MemoryRouter>)
    expect(screen.getByTestId('kyc-historico-vazio')).toBeTruthy()
    const botao = screen.getByRole('button', { name: /Checar/ })
    expect((botao as HTMLButtonElement).disabled).toBe(true)
    fireEvent.change(screen.getByLabelText('CNPJ da empresa'), { target: { value: '10.945.994/0001-72' } })
    expect((botao as HTMLButtonElement).disabled).toBe(false)
    expect(localStorage.getItem('lsm-kyc-cnpj')).toBe('10.945.994/0001-72')
    fireEvent.click(botao)
    await waitFor(() => expect(screen.getByTestId('kyc-risco').textContent).toBe('Risco baixo. Nenhum alerta encontrado.'))
    expect(invoke).toHaveBeenCalledWith('kyc', { body: { cnpj: '10.945.994/0001-72' } })
    expect(screen.getByText('EMPRESA X LTDA')).toBeTruthy()
    expect(screen.getByText(/Inidôneos: nada consta/)).toBeTruthy()
    expect(screen.getByText('A empresa não aparece em contratos nem fornecedores do escritório.')).toBeTruthy()
    fireEvent.click(screen.getByTestId('kyc-copiar'))
    await waitFor(() => expect(screen.getByTestId('kyc-copiar').textContent).toBe('Resultado copiado'))
    expect(write.mock.calls[0][0]).toContain('Checagem de contraparte — CNPJ 10.945.994/0001-72 — EMPRESA X LTDA')
    expect(write.mock.calls[0][0]).toContain('Risco: baixo — nenhum alerta')
  })

  it('erro da função vira alerta; status que mudou é destacado', async () => {
    invoke.mockResolvedValueOnce({ data: { erro: 'Receita fora do ar' }, error: null })
    render(<MemoryRouter><KycPage /></MemoryRouter>)
    fireEvent.change(screen.getByLabelText('CNPJ da empresa'), { target: { value: '10945994000172' } })
    fireEvent.click(screen.getByRole('button', { name: /Checar/ }))
    await waitFor(() => expect(screen.getByRole('alert').textContent).toBe('Receita fora do ar'))
    invoke.mockResolvedValueOnce({ data: { ...resultado, risco: 'alto', alertas: ['Consta no CEIS.'], mudou: true, riscoAnterior: 'baixo' }, error: null })
    fireEvent.click(screen.getByRole('button', { name: /Checar/ }))
    await waitFor(() => expect(screen.getByTestId('kyc-risco').textContent).toBe('Risco alto: Consta no CEIS.'))
    expect(screen.getByTestId('kyc-mudou').textContent).toContain('era baixo, agora é alto')
  })

  it('histórico: busca lembrada por nome ou CNPJ, clicar preenche o CNPJ, reconsultar agora e copiar histórico', async () => {
    const write = vi.fn(async (_t: string) => undefined); Object.assign(navigator, { clipboard: { writeText: write } })
    historico = [
      { id: 1, cnpj: '10945994000172', nome: 'EMPRESA X LTDA', risco: 'baixo', alertas: [], consultado_em: '2026-10-01T12:00:00Z', automatica: false, risco_anterior: null, mudou: false },
      { id: 2, cnpj: '11222333000181', nome: null, risco: 'alto', alertas: ['x'], consultado_em: '2026-10-02T12:00:00Z', automatica: true, risco_anterior: 'baixo', mudou: true },
    ]
    render(<MemoryRouter><KycPage /></MemoryRouter>)
    await waitFor(() => expect(screen.getAllByTestId('kyc-item').length).toBe(2))
    expect(screen.getAllByTestId('kyc-item')[1].textContent).toContain('(robô)')
    expect(screen.getAllByTestId('kyc-item-risco')[1].textContent).toContain('mudou (era baixo)')
    fireEvent.change(screen.getByTestId('kyc-busca'), { target: { value: '11.222' } })
    expect(screen.getAllByTestId('kyc-item').length).toBe(1)
    expect(localStorage.getItem('lsm-kyc-busca')).toBe('11.222')
    fireEvent.click(screen.getByText('11.222.333/0001-81'))
    expect((screen.getByLabelText('CNPJ da empresa') as HTMLInputElement).value).toBe('11.222.333/0001-81')
    fireEvent.change(screen.getByTestId('kyc-busca'), { target: { value: '' } })
    fireEvent.click(screen.getByTestId('kyc-copiar-historico'))
    await waitFor(() => expect(screen.getByTestId('kyc-copiar-historico').textContent).toBe('Histórico copiado'))
    expect(write.mock.calls[0][0]).toContain('EMPRESA X LTDA · risco baixo')
    invoke.mockResolvedValueOnce({ data: { reconsultados: 2, mudancas: 1 }, error: null })
    fireEvent.click(screen.getByTestId('kyc-reconsultar'))
    await waitFor(() => expect(screen.getByTestId('kyc-msg-recon').textContent).toBe('2 contraparte(s) reconsultada(s), 1 mudança(s) de status.'))
    expect(invoke).toHaveBeenCalledWith('kyc', { body: { reconsultar: true } })
  })
})
