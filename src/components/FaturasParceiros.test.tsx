// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'

let faturas: object[] = []
let pix: object | null = { pix_chave: '10945994000172', pix_nome: 'Value Pas', pix_cidade: 'Rio de Janeiro' }
const rpc = vi.fn()
const update = vi.fn(async () => ({ error: null }))
vi.mock('@/lib/supabase', () => ({
  supabaseConfigurado: true,
  supabase: {
    rpc: (nome: string) => nome === 'dados_pix' ? Promise.resolve({ data: [pix] }) : rpc(nome),
    from: () => ({ select: () => ({ order: () => ({ order: () => ({ limit: async () => ({ data: faturas }) }) }) }), update: () => ({ eq: update }) }),
  },
}))
vi.mock('qrcode', () => ({ default: { toDataURL: async () => 'data:image/png;base64,QR' } }))
const { default: FaturasParceiros, linhasFatura } = await import('./FaturasParceiros')
const fatura = { id: 'f1', escritorio_id: 'e1', competencia: '2026-11-01', operadores: 2, leitores: 1, valor_cheio: 900, desconto_pct: 30, valor: 630, vencimento: '2026-11-10', criado_em: '2026-11-01T03:00:00Z', pago_em: null }

describe('Faturas mensais dos escritórios parceiros (Value Pas)', () => {
  beforeEach(() => { cleanup(); faturas = []; rpc.mockReset(); update.mockClear() })

  it('linhas do PDF: operadores, leitores, desconto do primeiro ano, total, vencimento e PIX', () => {
    const l = linhasFatura(fatura, 'Escritório X', '000201PIX').map(x => x.texto.replace(/ /g, ' '))
    expect(l[0]).toBe('Fatura novembro de 2026')
    expect(l).toContain('2 operador(es) x R$ 390,00 = R$ 780,00')
    expect(l).toContain('1 leitor(es) x R$ 120,00 = R$ 120,00')
    expect(l).toContain('Desconto (30% no primeiro ano): -R$ 270,00')
    expect(l).toContain('Total: R$ 630,00')
    expect(l).toContain('Vencimento: 10/11/2026')
    expect(l).toContain('Em aberto')
    expect(l[l.length - 1]).toBe('000201PIX')
    expect(linhasFatura({ ...fatura, pago_em: '2026-11-05T10:00:00Z' }, 'X').map(x => x.texto)).toContain('Chave PIX não configurada (Configurações > PIX).')
  })

  it('lista faturas com valor e vencimento, mostra QR PIX, copia o código e marca como paga', async () => {
    faturas = [fatura]
    const writeText = vi.fn(async (_t: string) => undefined)
    Object.assign(navigator, { clipboard: { writeText } })
    render(<FaturasParceiros nomes={{ e1: 'Escritório X' }} />)
    const item = await screen.findByTestId('fatura-item')
    expect(item.textContent).toContain('Escritório X')
    expect(item.textContent).toContain('2 op · 1 leit')
    expect(screen.getByTestId('fatura-valor').textContent?.replace(/ /g, ' ')).toBe('R$ 630,00')
    expect(item.textContent).toContain('Vence 10/11/2026')
    fireEvent.click(screen.getByTestId('fatura-qr'))
    expect((await screen.findByTestId('fatura-qr-img')).getAttribute('src')).toContain('data:image/png')
    fireEvent.click(screen.getByTestId('fatura-copiar'))
    await waitFor(() => expect(screen.getByTestId('faturas-msg').textContent).toBe('Código PIX copiado.'))
    expect(writeText.mock.calls[0][0]).toContain('10945994000172')
    expect(writeText.mock.calls[0][0]).toContain('630.00')
    fireEvent.click(screen.getByTestId('fatura-paga'))
    await waitFor(() => expect(update).toHaveBeenCalledWith('id', 'f1'))
    expect(screen.getByTestId('faturas-msg').textContent).toBe('Fatura marcada como paga.')
  })

  it('sem faturas mostra aviso; Gerar agora chama o banco e informa a quantidade; sem chave PIX orienta', async () => {
    rpc.mockResolvedValue({ data: [{}, {}], error: null })
    render(<FaturasParceiros nomes={{}} />)
    expect(await screen.findByTestId('sem-faturas')).toBeTruthy()
    fireEvent.click(screen.getByTestId('gerar-faturas'))
    await waitFor(() => expect(screen.getByTestId('faturas-msg').textContent).toBe('2 fatura(s) na competência atual.'))
    cleanup(); pix = null; faturas = [fatura]
    render(<FaturasParceiros nomes={{}} />)
    fireEvent.click(await screen.findByTestId('fatura-qr'))
    await waitFor(() => expect(screen.getByTestId('faturas-msg').textContent).toContain('Defina a chave PIX em Configurações'))
  })
})
