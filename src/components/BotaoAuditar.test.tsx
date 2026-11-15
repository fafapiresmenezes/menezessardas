// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'

const invoke = vi.fn()
vi.mock('@/lib/supabase', () => ({ supabaseConfigurado: true, supabase: { functions: { invoke } } }))
const { default: BotaoAuditar } = await import('./BotaoAuditar')

describe('Auditoria de integridade com selo no Bitcoin', () => {
  beforeEach(() => { cleanup(); invoke.mockReset() })

  it('arquivo íntegro e selado: mostra o lote, oferece manifesto e prova .ots e verifica no Bitcoin', async () => {
    invoke
      .mockResolvedValueOnce({ data: { hashRegistrado: 'h', integro: true, selo: { id: 7, criado_em: '2026-11-01T03:00:00Z', prova_ots: btoa('ots'), manifesto: 'm' } }, error: null })
      .mockResolvedValueOnce({ data: { confirmado: true, altura: 920000, data_bloco: '2026-11-01T05:00:00Z', bloco_hash: '0000abcdef1234567890' }, error: null })
    render(<BotaoAuditar tabela="documentos" id="d1" />)
    fireEvent.click(screen.getByLabelText('Auditar integridade'))
    expect(invoke).toHaveBeenCalledWith('selar-documentos', { body: { auditar: { tabela: 'documentos', id: 'd1' } } })
    const status = await screen.findByRole('status')
    expect(status.textContent).toContain('Íntegro. Selado no Bitcoin (lote 7')
    expect(screen.getByText('manifesto')).toBeTruthy()
    expect(screen.getByText('prova de data (.ots)')).toBeTruthy()
    fireEvent.click(screen.getByTestId('verificar-ots'))
    await waitFor(() => expect(invoke).toHaveBeenLastCalledWith('selar-documentos', { body: { verificar: 7 } }))
    expect((await screen.findByTestId('resultado-ots')).textContent).toContain('Confirmado no Bitcoin: bloco 920000')
  })

  it('arquivo alterado dispara ALERTA; sem impressão digital explica o selo noturno; sem selo ainda avisa a próxima madrugada', async () => {
    invoke.mockResolvedValueOnce({ data: { hashRegistrado: 'h', integro: false }, error: null })
    render(<BotaoAuditar tabela="contratos" id="c1" />)
    fireEvent.click(screen.getByLabelText('Auditar integridade'))
    expect((await screen.findByRole('status')).textContent).toContain('ALERTA: o arquivo guardado é diferente do registrado.')
    cleanup(); invoke.mockResolvedValueOnce({ data: { hashRegistrado: null }, error: null })
    render(<BotaoAuditar tabela="contratos" id="c2" />)
    fireEvent.click(screen.getByLabelText('Auditar integridade'))
    expect((await screen.findByRole('status')).textContent).toContain('o selo é feito toda madrugada')
    cleanup(); invoke.mockResolvedValueOnce({ data: { hashRegistrado: 'h', integro: true }, error: null })
    render(<BotaoAuditar tabela="contratos" id="c3" />)
    fireEvent.click(screen.getByLabelText('Auditar integridade'))
    expect((await screen.findByRole('status')).textContent).toContain('O selo no Bitcoin sai na próxima madrugada.')
  })

  it('erro do servidor com motivo em JSON é mostrado; sem motivo, mensagem padrão', async () => {
    invoke.mockResolvedValueOnce({ data: null, error: { context: { json: async () => ({ erro: 'Arquivo não encontrado' }) } } })
    render(<BotaoAuditar tabela="documentos" id="x" />)
    fireEvent.click(screen.getByLabelText('Auditar integridade'))
    expect((await screen.findByRole('status')).textContent).toContain('Arquivo não encontrado')
    cleanup(); invoke.mockResolvedValueOnce({ data: null, error: { message: 'x' } })
    render(<BotaoAuditar tabela="documentos" id="y" />)
    fireEvent.click(screen.getByLabelText('Auditar integridade'))
    expect((await screen.findByRole('status')).textContent).toContain('Não foi possível auditar agora.')
  })
})
