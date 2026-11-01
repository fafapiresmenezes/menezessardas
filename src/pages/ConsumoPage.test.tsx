// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'

const mesAtual = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' }).slice(0, 7)
let linhas: object[] = []
let cotacao: object = { valor: 5, data: '2026-11-02', teto_brl: 300, mes_usd: 50 }
let perfil: string | null = 'admin'
let faturas: object[] = []
const rpc = vi.fn(async (f: string, _p?: object): Promise<{ data: unknown; error: { message: string } | null }> => (f === 'ler_cotacao' ? { data: cotacao, error: null } : { data: null, error: null }))
const upload = vi.fn(async (_p: string, _f: unknown): Promise<{ error: { message: string } | null }> => ({ error: null }))
const createSignedUrl = vi.fn(async (p: string) => ({ data: { signedUrl: 'https://assinado/' + p } }))
const invoke = vi.fn(async (_f: string, _o?: object): Promise<{ data: unknown; error: unknown }> => ({ data: { enviado: true, destinatarios: 1 }, error: null }))
vi.mock('@/lib/supabase', () => ({
  supabaseConfigurado: true,
  supabase: {
    from: (t: string) => ({ select: () => t === 'consumo_mensal' ? Promise.resolve({ data: linhas }) : { order: async () => ({ data: [{ modelo: 'claude-sonnet', usd_entrada_mtok: 3, usd_saida_mtok: 15, usd_por_unidade: 0, fonte: 'anthropic.com/pricing' }] }) } }),
    rpc: (f: string, p?: object) => rpc(f, p),
    storage: { from: () => ({ list: async () => ({ data: faturas }), upload, createSignedUrl }) },
    functions: { invoke: (f: string, o?: object) => invoke(f, o) },
  },
}))
vi.mock('@/lib/equipe', () => ({ perfilAtual: async () => perfil }))
vi.mock('@/components/Layout', () => ({ default: ({ title, children }: { title: string; children: React.ReactNode }) => <div><h1>{title}</h1>{children}</div> }))
const { default: ConsumoPage } = await import('./ConsumoPage')
const n = (s: string | null | undefined) => (s ?? '').replace(/ /g, ' ')

describe('Consumo de IA e e-mails', () => {
  beforeEach(() => { cleanup(); localStorage.clear(); rpc.mockClear(); upload.mockClear(); invoke.mockClear(); perfil = 'admin'; faturas = []
    cotacao = { valor: 5, data: '2026-11-02', teto_brl: 300, mes_usd: 50 }
    linhas = [
      { mes: `${mesAtual()}-01`, funcao: 'assistente-juridico', modelo: 'claude-sonnet', usuario: 'fatima@exemplo.com', usos: 10, tokens_entrada: 1000, tokens_saida: 500, custo_usd: 8 },
      { mes: `${mesAtual()}-01`, funcao: 'avisos por e-mail', modelo: null, usuario: 'robo', usos: 4, tokens_entrada: 0, tokens_saida: 0, custo_usd: 2 },
      { mes: '2026-09-01', funcao: 'assistente-juridico', modelo: 'claude-sonnet', usuario: 'fatima@exemplo.com', usos: 3, tokens_entrada: 300, tokens_saida: 100, custo_usd: 4 },
    ] })

  it('total do mês em reais pela cotação, por função e por usuário, projeção e tabela de preços; mês lembrado', async () => {
    render(<ConsumoPage />)
    await waitFor(() => expect(n(screen.getByTestId('total-mes').textContent)).toBe('R$ 50,00'))
    expect(screen.getByText('14 uso(s)', { exact: false })).toBeTruthy()
    expect(screen.getByText('Assistente jurídico')).toBeTruthy(); expect(screen.getByText('Avisos por e-mail')).toBeTruthy()
    expect(screen.getByText('fatima@exemplo.com')).toBeTruthy()
    expect(screen.getByTestId('projecao-mes').textContent).toContain('média dos últimos 1 mês(es)')
    expect(screen.getByText('claude-sonnet')).toBeTruthy()
    expect(n(screen.getByText(/Cotação usada/).textContent)).toBe('Cotação usada: US$ 1 = R$ 5,00 (2026-11-02).')
    fireEvent.change(screen.getByLabelText('Mês'), { target: { value: '2026-09' } })
    await waitFor(() => expect(n(screen.getByTestId('total-mes').textContent)).toBe('R$ 20,00'))
    expect(localStorage.getItem('lsm-consumo-mes')).toBe('2026-09')
    expect(screen.queryByTestId('projecao-mes')).toBeNull()
  })

  it('teto: 83% usado vira alerta; sugerir teto preenche o campo; salvar teto chama a RPC; teste de e-mail de aviso; leitor não vê o teto', async () => {
    render(<ConsumoPage />)
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('Atenção: 83% do teto mensal já foi usado.'))
    expect(n(screen.getByText(/de R\$ 300,00 neste mês/).textContent)).toBe('R$ 250,00 de R$ 300,00 neste mês.')
    fireEvent.click(screen.getByTestId('sugerir-teto'))
    expect((screen.getByLabelText('Valor em reais') as HTMLInputElement).value).not.toBe('')
    expect(screen.getByRole('status').textContent).toContain('Teto sugerido:')
    fireEvent.change(screen.getByLabelText('Valor em reais'), { target: { value: '400' } })
    fireEvent.click(screen.getByText('Salvar teto'))
    await waitFor(() => expect(rpc).toHaveBeenCalledWith('definir_teto_mensal', { valor_brl: 400 }))
    await waitFor(() => expect(n(screen.getByRole('status').textContent)).toBe('Teto mensal definido em R$ 400,00.'))
    fireEvent.click(screen.getByTestId('testar-aviso-teto'))
    await waitFor(() => expect(screen.getByRole('status').textContent).toContain('E-mail de teste do aviso de teto enviado para você (1 destinatário).'))
    expect(invoke).toHaveBeenCalledWith('aviso-teto-ia', { body: { teste: true } })
    cleanup(); perfil = 'leitor'; cotacao = { valor: 5, data: '2026-11-02', teto_brl: 300, mes_usd: 70 }
    render(<ConsumoPage />)
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('Teto do mês atingido'))
    expect(screen.queryByText('Salvar teto')).toBeNull()
  })

  it('faturas do mês: anexar envia ao armazenamento e abrir gera link assinado; copiar resumo e tabela; baixar CSV', async () => {
    const write = vi.fn(async (_t: string) => undefined); Object.assign(navigator, { clipboard: { writeText: write } })
    URL.createObjectURL = vi.fn(() => 'blob:x'); URL.revokeObjectURL = vi.fn(); window.open = vi.fn()
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined)
    faturas = [{ name: '1700000000-anthropic.pdf' }]
    render(<ConsumoPage />)
    await waitFor(() => expect(n(screen.getByTestId('total-mes').textContent)).toBe('R$ 50,00'))
    fireEvent.click(screen.getByText('anthropic.pdf'))
    await waitFor(() => expect(window.open).toHaveBeenCalledWith(`https://assinado/faturas/${mesAtual()}/1700000000-anthropic.pdf`, '_blank', 'noopener'))
    const f = new File(['x'], 'brevo nov.pdf', { type: 'application/pdf' })
    fireEvent.change(screen.getByText('Anexar fatura').querySelector('input')!, { target: { files: [f] } })
    await waitFor(() => expect(upload).toHaveBeenCalledWith(expect.stringMatching(new RegExp(`^faturas/${mesAtual()}/\\d+-brevo_nov.pdf$`)), f))
    await waitFor(() => expect(screen.getByRole('status').textContent).toBe('Fatura anexada ao extrato do mês.'))
    fireEvent.click(screen.getByTestId('copiar-consumo'))
    await waitFor(() => expect(screen.getByTestId('copiar-consumo').textContent).toBe('Resumo copiado'))
    expect(n(write.mock.calls[0][0])).toContain('Total: R$ 50,00 em 14 uso(s)')
    fireEvent.click(screen.getByTestId('copiar-funcao'))
    await waitFor(() => expect(screen.getByTestId('copiar-funcao').textContent).toBe('copiado'))
    expect(n(write.mock.calls[1][0])).toContain('Assistente jurídico: 10 uso(s) · R$ 40,00')
    fireEvent.click(screen.getByTestId('baixar-consumo'))
    expect(click).toHaveBeenCalled()
    expect(screen.getByTestId('baixar-consumo').textContent).toBe('baixado')
    click.mockRestore()
  })
})
