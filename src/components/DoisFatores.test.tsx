// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'

let fatores: { id: string; status: string; friendly_name?: string }[] = []
const enroll = vi.fn()
const challengeAndVerify = vi.fn()
const unenroll = vi.fn(async () => ({ error: null }))
vi.mock('../lib/supabase', () => ({
  supabaseConfigurado: true,
  supabase: { auth: { mfa: { listFactors: async () => ({ data: { totp: fatores } }), enroll, challengeAndVerify, unenroll } } },
}))
const { default: DoisFatores } = await import('./DoisFatores')

describe('Verificação em dois fatores (TOTP)', () => {
  beforeEach(() => { cleanup(); fatores = []; enroll.mockReset(); challengeAndVerify.mockReset(); unenroll.mockClear() })

  it('ativar mostra o QR e a chave; o código errado é recusado e o certo ativa', async () => {
    enroll.mockResolvedValue({ data: { id: 'f1', totp: { qr_code: 'data:image/svg+xml;base64,QR', secret: 'ABCD1234' } }, error: null })
    render(<DoisFatores />)
    fireEvent.click(await screen.findByTestId('ativar-2fa'))
    expect((await screen.findByAltText('QR code para o aplicativo autenticador')).getAttribute('src')).toContain('data:image')
    expect(screen.getByTestId('segredo-2fa').textContent).toBe('ABCD1234')
    const confirmar = screen.getByTestId('confirmar-2fa') as HTMLButtonElement
    expect(confirmar.disabled).toBe(true)
    fireEvent.change(screen.getByLabelText('Código de 6 dígitos'), { target: { value: '123 456' } })
    challengeAndVerify.mockResolvedValueOnce({ error: { message: 'bad' } })
    fireEvent.click(confirmar)
    expect((await screen.findByRole('status')).textContent).toContain('Código não confere')
    challengeAndVerify.mockResolvedValueOnce({ error: null })
    fatores = [{ id: 'f1', status: 'verified', friendly_name: 'GMenezes' }]
    fireEvent.click(screen.getByTestId('confirmar-2fa'))
    await waitFor(() => expect(challengeAndVerify).toHaveBeenLastCalledWith({ factorId: 'f1', code: '123456' }))
    expect((await screen.findByRole('status')).textContent).toContain('Dois fatores ativados')
    await waitFor(() => expect(screen.getByText('GMenezes')).toBeTruthy())
    expect(screen.queryByTestId('ativar-2fa')).toBeNull()
  })

  it('rascunhos não verificados são descartados antes de um novo QR; desativar pede confirmação', async () => {
    fatores = [{ id: 'velho', status: 'unverified' }]
    enroll.mockResolvedValue({ data: { id: 'f2', totp: { qr_code: 'data:x', secret: 'S' } }, error: null })
    render(<DoisFatores />)
    fireEvent.click(await screen.findByTestId('ativar-2fa'))
    await waitFor(() => expect(unenroll).toHaveBeenCalledWith({ factorId: 'velho' }))
    cleanup(); fatores = [{ id: 'f1', status: 'verified' }]
    window.confirm = vi.fn(() => false)
    render(<DoisFatores />)
    fireEvent.click(await screen.findByText('Desativar'))
    expect(unenroll).toHaveBeenCalledTimes(1)
    window.confirm = vi.fn(() => true)
    fireEvent.click(screen.getByText('Desativar'))
    await waitFor(() => expect(unenroll).toHaveBeenCalledWith({ factorId: 'f1' }))
    expect((await screen.findByRole('status')).textContent).toBe('Dois fatores desativados.')
  })
})
