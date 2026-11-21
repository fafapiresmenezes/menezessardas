// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

describe('caixinha "não sou robô"', () => {
  it('sem código do site não mostra nada e não carrega programa de fora', async () => {
    vi.resetModules()
    vi.doMock('@/lib/captcha', () => ({ CAPTCHA_SITEKEY: '', captchaLigado: () => false }))
    const { default: CaptchaRobo } = await import('./CaptchaRobo')
    const { container } = render(<CaptchaRobo aoMudar={() => {}} />)
    expect(container.innerHTML).toBe('')
    expect(document.querySelector('script[src*="hcaptcha"]')).toBeNull()
  })
  it('com código do site desenha a caixinha e entrega o comprovante', async () => {
    vi.resetModules()
    vi.doMock('@/lib/captcha', () => ({ CAPTCHA_SITEKEY: 'chave-publica', captchaLigado: () => true }))
    let opcoes: Record<string, unknown> = {}
    window.hcaptcha = { render: (_el, o) => { opcoes = o; return 'w1' }, reset: vi.fn(), remove: vi.fn() }
    const { default: CaptchaRobo } = await import('./CaptchaRobo')
    const aoMudar = vi.fn()
    render(<CaptchaRobo aoMudar={aoMudar} />)
    expect(screen.getByTestId('captcha-robo')).toBeTruthy()
    await vi.waitFor(() => expect(opcoes.sitekey).toBe('chave-publica'))
    ;(opcoes.callback as (c: string) => void)('comprovante-1')
    expect(aoMudar).toHaveBeenCalledWith('comprovante-1')
    ;(opcoes['expired-callback'] as () => void)()
    expect(aoMudar).toHaveBeenLastCalledWith('')
  })
})
