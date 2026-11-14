// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup, within } from '@testing-library/react'
// A aba abre no clique e recebe o link assinado depois (Safari bloqueia window.open após await).
const aba = { location: { href: '' }, close: () => undefined, opener: null as unknown }

let msgs: object[] = []
let docs: object[] = []
const insert = vi.fn(async (_r: object) => ({ error: null }))
const update = vi.fn(async (_t: string, _r: object) => ({ error: null }))
vi.mock('@/lib/supabase', () => ({
  supabaseConfigurado: true,
  supabase: {
    from: (t: string) => ({
      select: () => ({ eq: () => ({ order: async () => ({ data: t === 'mensagens_portal' ? msgs : docs }) }) }),
      insert: (r: object) => insert(r),
      update: (r: object) => { const o = { eq: () => o, is: async () => update(t, r), then: (f: (v: unknown) => unknown) => update(t, r).then(f) }; return o },
    }),
    auth: { getUser: async () => ({ data: { user: { id: 'u1', email: 'leticia@x', user_metadata: { nome_completo: 'Letícia Alves' } } } }) },
  },
}))
vi.mock('@/lib/arquivos', () => ({ urlAssinada: async (c: string) => `https://assinada/${c}` }))
const { default: PortalCasoEscritorio } = await import('./PortalCasoEscritorio')

describe('Conversa e documentos do Portal, lado do escritório (D18)', () => {
  beforeEach(() => { cleanup(); insert.mockClear(); update.mockClear(); msgs = []; docs = []; window.open = vi.fn(() => aba as unknown as Window) })

  it('mostra mensagens novas do cliente, marca lidas, responde com o nome de quem está logado', async () => {
    msgs = [{ id: 1, autor: 'cliente', autor_nome: 'Ana', texto: 'Quando é a audiência?', criado_em: '2026-11-05T13:00:00Z', lido_em: null }]
    render(<PortalCasoEscritorio tarefaId="c1" cliente="Ana" />)
    const lista = await screen.findByTestId('portal-escritorio-mensagens')
    expect(within(lista).getByTestId('esc-msg-cliente').textContent).toContain('Ana')
    await waitFor(() => expect(update).toHaveBeenCalledWith('mensagens_portal', expect.objectContaining({ lido_em: expect.any(String) })))
    fireEvent.click(screen.getByTestId('esc-responder'))
    expect(screen.getByRole('alert').textContent).toBe('Escreva a resposta.')
    fireEvent.change(screen.getByTestId('esc-texto'), { target: { value: 'Dia 20/11 às 14h.' } })
    fireEvent.click(screen.getByTestId('esc-responder'))
    await waitFor(() => expect(insert).toHaveBeenCalledWith({ tarefa_id: 'c1', autor: 'escritorio', autor_nome: 'Letícia Alves', texto: 'Dia 20/11 às 14h.' }))
  })

  it('abre documento do cliente por link assinado e marca como visto', async () => {
    docs = [{ id: 7, nome: 'rg.jpg', caminho: 'portal/c1/x-rg.jpg', tamanho: 4096, enviado_em: '2026-11-05T10:00:00Z', visto_em: null }]
    render(<PortalCasoEscritorio tarefaId="c1" cliente="Ana" />)
    const li = await screen.findByTestId('esc-documentos')
    expect(li.textContent).toContain('novo')
    fireEvent.click(within(li).getByTestId('esc-abrir-doc'))
    await waitFor(() => expect(aba.location.href).toBe('https://assinada/portal/c1/x-rg.jpg'))
    await waitFor(() => expect(update).toHaveBeenCalledWith('documentos_portal', expect.objectContaining({ visto_em: expect.any(String) })))
  })
})
