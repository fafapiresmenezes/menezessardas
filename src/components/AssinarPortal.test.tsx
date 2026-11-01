// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'

let docs: object[] = []
const rpc = vi.fn(async (nome: string): Promise<{ data?: unknown; error: { message: string } | null }> => nome === 'portal_assinaturas' ? { data: docs, error: null } : { error: null })
vi.mock('@/lib/supabase', () => ({ supabaseConfigurado: true, supabase: { rpc } }))
const { default: AssinarPortal } = await import('./AssinarPortal')
const pendente = { id: 'd1', titulo: 'Contrato de honorários', texto: 'Contrato de comodato e fiador.', hash_texto: 'a'.repeat(64), assinante_nome: null, assinado_em: null, hash_assinatura: null }

describe('Assinatura pelo portal do cliente', () => {
  beforeEach(() => { cleanup(); rpc.mockClear(); docs = [] })

  it('sem documentos não mostra nada', async () => {
    const { container } = render(<AssinarPortal token="tok" />)
    await waitFor(() => expect(rpc).toHaveBeenCalledWith('portal_assinaturas', { p_token: 'tok' }))
    expect(container.innerHTML).toBe('')
  })

  it('mostra o texto com termos explicados e a impressão digital; só assina depois de nome, documento e aceite', async () => {
    docs = [pendente]
    render(<AssinarPortal token="tok" />)
    const secao = await screen.findByTestId('portal-assinaturas')
    expect(secao.textContent).toContain('Impressão digital do texto (SHA-256): ' + 'a'.repeat(24) + '…')
    expect(screen.getAllByTestId('termo').map(t => t.textContent)).toContain('comodato')
    const botao = screen.getByTestId('assinar') as HTMLButtonElement
    expect(botao.disabled).toBe(true)
    fireEvent.change(screen.getByTestId('assin-nome'), { target: { value: 'Maria Silva' } })
    fireEvent.change(screen.getByTestId('assin-doc'), { target: { value: '123.456.789-00' } })
    fireEvent.click(screen.getByTestId('assin-aceite'))
    expect(botao.disabled).toBe(false)
    docs = [{ ...pendente, assinante_nome: 'Maria Silva', assinado_em: '2026-11-02T12:00:00Z', hash_assinatura: 'b'.repeat(64) }]
    fireEvent.click(botao)
    await waitFor(() => expect(rpc).toHaveBeenCalledWith('portal_assinar', { p_token: 'tok', p_id: 'd1', p_nome: 'Maria Silva', p_documento: '123.456.789-00' }))
    expect((await screen.findByTestId('portal-assinado')).textContent).toContain('Assinado por Maria Silva em 02/11/2026. Comprovante: ' + 'b'.repeat(24))
  })

  it('recusa do servidor vira alerta', async () => {
    docs = [pendente]
    rpc.mockImplementation(async (nome: string) => nome === 'portal_assinaturas' ? { data: docs, error: null } : { error: { message: 'Link expirado' } })
    render(<AssinarPortal token="tok" />)
    await screen.findByTestId('assinar')
    fireEvent.change(screen.getByTestId('assin-nome'), { target: { value: 'X' } })
    fireEvent.change(screen.getByTestId('assin-doc'), { target: { value: '1' } })
    fireEvent.click(screen.getByTestId('assin-aceite'))
    fireEvent.click(screen.getByTestId('assinar'))
    expect((await screen.findByRole('alert')).textContent).toBe('Link expirado')
  })
})
