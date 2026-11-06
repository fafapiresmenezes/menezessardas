// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup, within } from '@testing-library/react'

let msgs: object[] = []
let docs: object[] = []
let parcelas: { pix: object | null; parcelas: object[] } | null = null
const rpc = vi.fn(async (n: string, _a: object): Promise<{ data?: unknown; error: { message: string } | null }> => {
  if (n === 'portal_mensagens') return { data: msgs, error: null }
  if (n === 'portal_documentos') return { data: docs, error: null }
  if (n === 'portal_parcelas') return { data: parcelas, error: null }
  if (n === 'portal_enviar_mensagem') return { data: 9, error: null }
  return { data: 0, error: null }
})
const invoke = vi.fn(async (_n: string, _o: object): Promise<{ data: unknown; error: unknown }> => ({ data: { ok: true, documento: { id: 1 } }, error: null }))
vi.mock('@/lib/supabase', () => ({ supabaseConfigurado: true, supabase: { rpc: (n: string, a: object) => rpc(n, a), functions: { invoke: (n: string, o: object) => invoke(n, o) } } }))
vi.mock('@/components/CobrancaPix', () => ({ default: ({ valor, referencia, dados }: { valor: number; referencia?: string; dados?: { pix_chave: string } }) => <div data-testid="pix-stub">{valor} {referencia} {dados?.pix_chave}</div> }))
const { default: PortalMensagens } = await import('./PortalMensagens')

describe('Portal do cliente: mensagens, documentos e PIX por parcela (D18)', () => {
  beforeEach(() => { cleanup(); rpc.mockClear(); invoke.mockClear(); msgs = []; docs = []; parcelas = null })

  it('lista a conversa, marca lidas ao abrir, valida e envia mensagem', async () => {
    msgs = [{ id: 1, autor: 'escritorio', autor_nome: 'Letícia', texto: 'Recebemos a procuração.', criado_em: '2026-11-05T12:00:00Z' }, { id: 2, autor: 'cliente', autor_nome: 'Ana', texto: 'Obrigada!', criado_em: '2026-11-05T13:00:00Z' }]
    render(<PortalMensagens token="tok1" caso="Despejo Rua A" />)
    const lista = await screen.findByTestId('portal-mensagens')
    await waitFor(() => expect(within(lista).getAllByRole('listitem')).toHaveLength(2))
    expect(within(lista).getByTestId('msg-escritorio').textContent).toContain('Letícia')
    expect(within(lista).getByTestId('msg-cliente').textContent).toContain('Você')
    expect(rpc).toHaveBeenCalledWith('portal_marcar_lidas', { p_token: 'tok1' })
    fireEvent.click(screen.getByTestId('portal-enviar'))
    expect(screen.getByTestId('portal-erro').textContent).toBe('Escreva a mensagem.')
    fireEvent.change(screen.getByTestId('portal-texto'), { target: { value: 'Quando é a audiência?' } })
    fireEvent.click(screen.getByTestId('portal-enviar'))
    await waitFor(() => expect(rpc).toHaveBeenCalledWith('portal_enviar_mensagem', { p_token: 'tok1', p_texto: 'Quando é a audiência?' }))
    expect((await screen.findByTestId('portal-aviso')).textContent).toBe('Mensagem enviada ao escritório.')
    expect((screen.getByTestId('portal-texto') as HTMLTextAreaElement).value).toBe('')
  })

  it('envia documento pela função do Portal e lista os já enviados', async () => {
    docs = [{ id: 1, nome: 'procuracao.pdf', tamanho: 2048, enviado_em: '2026-11-04T10:00:00Z', visto_em: '2026-11-05T10:00:00Z' }]
    render(<PortalMensagens token="tok1" caso="Despejo Rua A" />)
    expect((await screen.findByTestId('portal-documentos')).textContent).toContain('procuracao.pdf · 2 KB · enviado em 04/11/2026 · visto pelo escritório')
    const f = new File(['x'], 'rg.jpg', { type: 'image/jpeg' })
    fireEvent.change(screen.getByTestId('portal-arquivo'), { target: { files: [f] } })
    await waitFor(() => expect(invoke).toHaveBeenCalledWith('portal-documento', expect.objectContaining({ body: expect.any(FormData) })))
    const corpo = (invoke.mock.calls[0][1] as { body: FormData }).body
    expect(corpo.get('token')).toBe('tok1'); expect((corpo.get('arquivo') as File).name).toBe('rg.jpg')
    expect((await screen.findByTestId('portal-aviso')).textContent).toContain('"rg.jpg" enviado')
    invoke.mockResolvedValueOnce({ data: { erro: 'O arquivo precisa ter até 10 MB.' }, error: null })
    fireEvent.change(screen.getByTestId('portal-arquivo'), { target: { files: [f] } })
    expect((await screen.findByTestId('portal-erro')).textContent).toBe('O arquivo precisa ter até 10 MB.')
  })

  it('parcelas com situação e PIX com o valor da parcela; sem chave PIX avisa', async () => {
    parcelas = { pix: { chave: '10945994000172', nome: 'GMenezes', cidade: 'Rio de Janeiro' }, parcelas: [{ id: 1, numero: 1, vencimento: '2026-10-01', valor: 500, pago_em: '2026-10-01' }, { id: 2, numero: 2, vencimento: '2099-01-01', valor: 500.5, pago_em: null }] }
    render(<PortalMensagens token="tok1" caso="Despejo Rua A" />)
    const bloco = await screen.findByTestId('portal-parcelas')
    const itens = within(bloco).getAllByTestId('portal-parcela')
    expect(itens[0].textContent).toContain('Paga'); expect(itens[1].textContent).toContain('Em dia')
    fireEvent.click(within(bloco).getByLabelText('Pagar parcela 2 por PIX'))
    expect(screen.getByTestId('pix-stub').textContent).toBe('500.5 Despejo Rua AP2 10945994000172')
    cleanup(); parcelas = { pix: null, parcelas: [{ id: 2, numero: 1, vencimento: '2099-01-01', valor: 500, pago_em: null }] }
    render(<PortalMensagens token="tok1" caso="Despejo Rua A" />)
    expect((await screen.findByTestId('portal-parcelas')).textContent).toContain('PIX ainda não cadastrado')
  })
})
