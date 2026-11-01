// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'

// Servidor e gerador de QR simulados: a chave PIX vem do teste.
const rpc = vi.fn()
vi.mock('@/lib/supabase', () => ({ supabaseConfigurado: true, supabase: { rpc } }))
vi.mock('qrcode', () => ({ default: { toDataURL: async () => 'data:image/png;base64,QR' } }))
const { default: CobrancaPix } = await import('./CobrancaPix')

describe('Cobrança por PIX', () => {
  beforeEach(() => { cleanup(); rpc.mockReset() })

  it('monta o código copia e cola com a chave do escritório e mostra o QR', async () => {
    rpc.mockResolvedValue({ data: [{ pix_chave: '10945994000172', pix_nome: 'GMenezes', pix_cidade: 'Rio de Janeiro' }], error: null })
    render(<CobrancaPix valor={1500} caso="Caso 1" cliente="Maria" fechar={() => {}} />)
    const campo = await screen.findByTestId('pix-codigo') as HTMLTextAreaElement
    expect(campo.value).toContain('10945994000172')
    expect(campo.value).toContain('1500.00')
    expect(screen.getByAltText('QR code do PIX').getAttribute('src')).toContain('data:image/png')
    expect(document.body.textContent).toContain('Maria')
    expect(document.body.textContent).toContain('1.500,00')
  })

  it('sem chave cadastrada orienta a ir a Configurações', async () => {
    rpc.mockResolvedValue({ data: [{ pix_chave: null }], error: null })
    render(<CobrancaPix valor={10} caso="C" cliente={null} fechar={() => {}} />)
    const alerta = await screen.findByRole('alert')
    expect(alerta.textContent).toContain('Configurações → Cobrança por PIX')
    expect(screen.queryByTestId('pix-codigo')).toBeNull()
  })

  it('copiar usa a área de transferência e confirma; fechar chama o retorno', async () => {
    rpc.mockResolvedValue({ data: { pix_chave: 'chave@x', pix_nome: null, pix_cidade: null }, error: null })
    const writeText = vi.fn(async () => undefined)
    Object.assign(navigator, { clipboard: { writeText } })
    const fechar = vi.fn()
    render(<CobrancaPix valor={10} caso="C" cliente={null} fechar={fechar} />)
    fireEvent.click(await screen.findByText('Copiar código'))
    await waitFor(() => expect(screen.getByText('Copiado')).toBeTruthy())
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining('chave@x'))
    fireEvent.click(screen.getByLabelText('Fechar'))
    expect(fechar).toHaveBeenCalled()
  })
})
