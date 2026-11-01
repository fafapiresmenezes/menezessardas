// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'

let wcag: string | null = null
vi.mock('@/lib/supabase', () => ({
  supabaseConfigurado: true,
  supabase: { from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: wcag ? { valor: wcag } : null }) }) }) }) },
}))
vi.mock('@/data/rotas', () => ({ ROTAS_TELAS: [{ rota: '/a', nome: 'Tela A' }, { rota: '/b', nome: 'Tela B' }] }))
const { default: TesteTelas, testarTela } = await import('./TesteTelas')

function janelaFalsa(opts: { h1?: string; fonte?: string; texto?: string; hash?: string } = {}) {
  const w = {
    closed: false,
    location: { hash: '' },
    document: { body: { innerText: opts.texto ?? 'ok' }, location: { hash: '' }, querySelector: () => (opts.h1 === undefined ? { textContent: 'Título' } : opts.h1 ? { textContent: opts.h1 } : null) },
    getComputedStyle: () => ({ fontFamily: opts.fonte ?? 'Inter, system-ui' }),
  }
  Object.defineProperty(w.location, 'hash', { set(v: string) { w.document.location.hash = opts.hash ?? v }, get() { return w.document.location.hash } })
  return w as unknown as Window
}

describe('Testar todas as telas (janela auxiliar)', () => {
  beforeEach(() => { cleanup(); wcag = null })
  afterEach(() => vi.useRealTimers())

  it('aprova tela com título e CSS, reprova sem CSS, sem título, com texto de erro, e aceita redirecionamento', async () => {
    vi.useFakeTimers()
    const roda = async (w: Window) => { const p = testarTela('/a', w); await vi.advanceTimersByTimeAsync(5000); return p }
    expect(await roda(janelaFalsa())).toEqual({ ok: true, detalhe: 'Título' })
    expect(await roda(janelaFalsa({ fonte: 'Times' }))).toEqual({ ok: false, detalhe: 'CSS não carregou' })
    expect(await roda(janelaFalsa({ h1: '' }))).toEqual({ ok: false, detalhe: 'sem título (h1)' })
    expect((await roda(janelaFalsa({ texto: 'Algo deu errado aqui' }))).detalhe).toContain('texto de erro: Algo deu errado')
    expect((await roda(janelaFalsa({ hash: '#/login' }))).detalhe).toContain('abriu /login')
    const fechada = janelaFalsa(); (fechada as unknown as { closed: boolean }).closed = true
    expect(await roda(fechada)).toEqual({ ok: false, detalhe: 'janela de teste fechada' })
  })

  it('não carregou em 12 s quando o documento nunca fica pronto', async () => {
    vi.useFakeTimers()
    const w = janelaFalsa(); (w.document as unknown as { body: null }).body = null
    const p = testarTela('/a', w)
    await vi.advanceTimersByTimeAsync(13000)
    expect(await p).toEqual({ ok: false, detalhe: 'não carregou em 12 s' })
  })

  it('tela: mostra resumo WCAG gravado; pop-up bloqueado vira aviso; com janela testa cada rota e resume', async () => {
    wcag = JSON.stringify({ data: '2026-11-01T10:00:00Z', telas: 40, serias: 0, menores: 2, detalhe: [] })
    window.open = vi.fn(() => null) as unknown as typeof window.open
    render(<TesteTelas />)
    expect((await screen.findByTestId('wcag-resumo')).textContent).toContain('40 telas auditadas')
    expect(screen.getByTestId('wcag-resumo').textContent).toContain('Nenhuma pendência')
    fireEvent.click(screen.getByTestId('testar-telas'))
    await waitFor(() => expect(screen.getByTestId('tela-resultado').textContent).toContain('permita pop-ups'))
    cleanup()
    const w = janelaFalsa(); (w as unknown as { close: () => void }).close = vi.fn()
    window.open = vi.fn(() => w) as unknown as typeof window.open
    render(<TesteTelas />)
    fireEvent.click(screen.getByTestId('testar-telas'))
    await waitFor(() => expect(screen.getByTestId('testar-telas').textContent).toContain('Testando 1 de 2'))
    await waitFor(() => expect(screen.getByTestId('telas-resumo').textContent).toBe('2 de 2 telas funcionando · concluído'), { timeout: 12000 })
    expect(screen.getAllByTestId('tela-resultado').every(li => li.getAttribute('data-ok') === 'true')).toBe(true)
  }, 15000)
})
