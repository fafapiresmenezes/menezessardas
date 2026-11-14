// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup, within } from '@testing-library/react'

const hoje = new Date(); const iso = (d: number) => new Date(hoje.getTime() + d * 86400000).toISOString().slice(0, 10)
let casos: object[] = []
let pagamentos: object[] = []
let parcelas: object[] = []
const rpc = vi.fn(async (_f: string, _a: object): Promise<{ error: { message: string } | null; data?: unknown }> => ({ error: null, data: 3 }))
const insert = vi.fn(async (_r: object): Promise<{ error: { message: string } | null }> => ({ error: null }))
const update = vi.fn(async (_r: object): Promise<{ error: { message: string } | null }> => ({ error: null }))
const del = vi.fn(async () => ({}))
vi.mock('@/lib/supabase', () => ({
  supabaseConfigurado: true,
  supabase: { from: (t: string) => t === 'tarefas'
    ? { select: () => ({ eq: () => ({ order: async () => ({ data: casos, error: null }) }) }), update: (r: object) => ({ eq: async () => update(r) }) }
    : t === 'lancamentos_horas' ? { select: async () => ({ data: [{ cliente: 'Ana', minutos: 120, valor_hora: 300 }] }) }
    : t === 'parcelas_honorarios' ? { select: () => ({ order: async () => ({ data: parcelas }) }) }
    : { select: () => ({ order: async () => ({ data: pagamentos }) }), insert: (r: object) => insert(r), delete: () => ({ eq: async () => { await del(); return {} } }) }, rpc: (f: string, a: object) => rpc(f, a) },
}))
vi.mock('@/components/Layout', () => ({ default: ({ title, children }: { title: string; children: React.ReactNode }) => <div><h1>{title}</h1>{children}</div> }))
vi.mock('@/components/CobrancaPix', () => ({ default: ({ valor, caso, referencia }: { valor: number; caso: string; referencia?: string }) => <div data-testid="pix-stub">{caso} {valor}{referencia ? ` ${referencia}` : ''}</div> }))
const { default: HonorariosPage } = await import('./HonorariosPage')
const n = (s: string | null | undefined) => (s ?? '').replace(/ /g, ' ')

// Apagar agora pede confirmação: nos testes, a pessoa sempre confirma.
beforeEach(() => { vi.spyOn(window, 'confirm').mockReturnValue(true) })

describe('Honorários', () => {
  beforeEach(() => { cleanup(); insert.mockClear(); update.mockClear(); del.mockClear(); rpc.mockClear(); pagamentos = []; parcelas = []
    casos = [
      { id: 'c1', titulo: 'Despejo Rua A', cliente: 'Ana', area: 'Imobiliário', situacao: 'andamento', honorario_previsto: 5000, honorario_recebido: 2000, vencimento_honorario: iso(-10) },
      { id: 'c2', titulo: 'Consultoria B', cliente: 'Bruno', area: null, situacao: 'andamento', honorario_previsto: 1000, honorario_recebido: 1000, vencimento_honorario: null },
      { id: 'c3', titulo: 'Revisão C', cliente: null, area: null, situacao: 'andamento', honorario_previsto: 800, honorario_recebido: 0, vencimento_honorario: iso(3) },
    ] })

  it('totais, régua de cobrança por vencimento e rentabilidade pelo custo das horas do cliente', async () => {
    render(<HonorariosPage />)
    await waitFor(() => expect(screen.getByText('Despejo Rua A')).toBeTruthy())
    const cartoes = Array.from(document.querySelectorAll('section.grid p.text-2xl')).map(e => n(e.textContent))
    expect(cartoes).toEqual(['R$ 6.800,00', 'R$ 3.000,00', 'R$ 3.800,00', 'R$ 600,00'])
    const linhas = within(screen.getByTestId('tabela-honorarios')).getAllByRole('row').slice(1)
    expect(linhas[0].textContent).toContain('Atrasado 10 dias')
    expect(n(linhas[0].textContent)).toContain('R$ 1.400,00'); expect(n(linhas[0].textContent)).toContain('custo R$ 600,00')
    expect(linhas[1].textContent).toContain('Quitado')
    expect(within(linhas[1]).queryByText('Carta de cobrança')).toBeNull()
    expect(linhas[2].textContent).toContain('Vence em 3 dias')
  })

  it('editar combinado/vencimento e salvar; cobrar por PIX abre a cobrança com o saldo; carta de cobrança abre e imprime', async () => {
    const w = { document: { write: vi.fn(), close: vi.fn() }, print: vi.fn() }
    window.open = vi.fn(() => w as unknown as Window)
    render(<HonorariosPage />)
    await waitFor(() => expect(screen.getByText('Despejo Rua A')).toBeTruthy())
    fireEvent.change(screen.getByLabelText('Combinado Despejo Rua A'), { target: { value: '6000' } })
    fireEvent.change(screen.getByLabelText('Vencimento Despejo Rua A'), { target: { value: '' } })
    fireEvent.click(screen.getByText('Salvar'))
    await waitFor(() => expect(update).toHaveBeenCalledWith({ honorario_previsto: 6000, honorario_recebido: 2000, vencimento_honorario: null }))
    fireEvent.click(screen.getAllByTestId('cobrar-pix')[0])
    expect(screen.getByTestId('pix-stub').textContent).toBe('Despejo Rua A 3000 Despejo Rua A')
    fireEvent.click(screen.getAllByText('Carta de cobrança')[0])
    expect(w.document.write.mock.calls[0][0]).toContain('Prezado(a) Ana')
    expect(n(w.document.write.mock.calls[0][0])).toContain('R$ 3.000,00')
    expect(w.print).toHaveBeenCalled()
  })

  it('registrar pagamento sugere o saldo, valida o valor, grava a baixa e lista; apagar pagamento; copiar resumo da cobrança; baixar CSV', async () => {
    const write = vi.fn(async (_t: string) => undefined); Object.assign(navigator, { clipboard: { writeText: write } })
    URL.createObjectURL = vi.fn(() => 'blob:x'); URL.revokeObjectURL = vi.fn()
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined)
    render(<HonorariosPage />)
    await waitFor(() => expect(screen.getByText('Despejo Rua A')).toBeTruthy())
    fireEvent.click(screen.getAllByTestId('registrar-pagamento')[0])
    expect((screen.getByTestId('baixa-valor') as HTMLInputElement).value).toBe('3000')
    fireEvent.change(screen.getByTestId('baixa-valor'), { target: { value: '0' } })
    fireEvent.click(screen.getByTestId('baixa-salvar'))
    expect(screen.getByTestId('msg-baixa').textContent).toBe('Informe um valor maior que zero.')
    pagamentos = [{ id: 1, caso_id: 'c1', data: '2026-11-02', valor: 1500, meio: 'pix', observacao: null }]
    fireEvent.change(screen.getByTestId('baixa-valor'), { target: { value: '1500' } })
    fireEvent.change(screen.getByTestId('baixa-meio'), { target: { value: 'boleto' } })
    fireEvent.click(screen.getByTestId('baixa-salvar'))
    await waitFor(() => expect(insert).toHaveBeenCalledWith(expect.objectContaining({ caso_id: 'c1', valor: 1500, meio: 'boleto', observacao: null })))
    await waitFor(() => expect(n(screen.getByTestId('msg-baixa').textContent)).toContain('Pagamento de R$ 1.500,00 registrado em'))
    expect(screen.queryByTestId('form-baixa')).toBeNull()
    await waitFor(() => expect(screen.getAllByTestId('pagamento').length).toBe(1))
    expect(n(screen.getByTestId('pagamento').textContent)).toContain('02/11/2026 · R$ 1.500,00 · PIX')
    fireEvent.click(screen.getByLabelText('Apagar pagamento'))
    await waitFor(() => expect(del).toHaveBeenCalled())
    fireEvent.click(screen.getByTestId('copiar-cobranca'))
    const t = n(write.mock.calls[0][0])
    expect(t).toContain('Combinado R$ 6.800,00 · Recebido R$ 3.000,00 · Em aberto R$ 3.800,00 · Custo das horas R$ 600,00')
    expect(t).toContain('Casos com saldo em aberto: 2'); expect(t).toContain('Despejo Rua A · Ana · R$ 3.000,00 · Atrasado 10 dias')
    fireEvent.click(screen.getByTestId('baixar-honorarios'))
    expect(click).toHaveBeenCalled()
    expect(screen.getByTestId('baixar-honorarios').textContent).toBe('Baixado')
    click.mockRestore()
  })

  it('D13: parcelar sugere o saldo e prévia, gera parcelas pela RPC; lista parcelas com situação; PIX por parcela com o valor da parcela; marcar paga', async () => {
    parcelas = [
      { id: 11, caso_id: 'c1', numero: 1, vencimento: iso(-20), valor: 1000, pago_em: iso(-20), pagamento_id: 5 },
      { id: 12, caso_id: 'c1', numero: 2, vencimento: iso(-3), valor: 1000, pago_em: null, pagamento_id: null },
      { id: 13, caso_id: 'c1', numero: 3, vencimento: iso(40), valor: 1000, pago_em: null, pagamento_id: null },
    ]
    render(<HonorariosPage />)
    await screen.findByText('Despejo Rua A')
    const lista = await screen.findByTestId('parcelas-caso')
    expect(n(lista.textContent)).toContain('1/3 pagas')
    expect(n(lista.textContent)).toContain('1 atrasada')
    const itens = within(lista).getAllByTestId('parcela')
    expect(itens).toHaveLength(3)
    expect(n(itens[0].textContent)).toContain('Paga'); expect(n(itens[1].textContent)).toContain('Atrasada 3 dias'); expect(n(itens[2].textContent)).toContain('Em dia')
    fireEvent.click(within(lista).getByLabelText('PIX da parcela 2'))
    expect(n(screen.getByTestId('pix-stub').textContent)).toBe('Despejo Rua A 1000 Despejo Rua AP2')
    fireEvent.click(within(lista).getAllByTestId('quitar-parcela')[0])
    await waitFor(() => expect(rpc).toHaveBeenCalledWith('quitar_parcela', expect.objectContaining({ p_parcela: 12, p_meio: 'pix' })))
    expect(n((await screen.findByTestId('msg-parcelas')).textContent)).toContain('Parcela 2 quitada')
    // Parcelar o caso c3 (saldo 800) em 3 vezes.
    fireEvent.click(screen.getAllByTestId('parcelar')[1])
    const form = screen.getByTestId('form-parcelar')
    expect((within(form).getByTestId('parcelar-total') as HTMLInputElement).value).toBe('800.00')
    expect(n(within(form).getByTestId('parcelar-previa').textContent)).toMatch(/3× R\$ 266,66 \(última R\$ 266,68\)/)
    fireEvent.change(within(form).getByTestId('parcelar-quantidade'), { target: { value: '0' } })
    fireEvent.click(within(form).getByTestId('parcelar-salvar'))
    expect(n(screen.getByTestId('msg-parcelas').textContent)).toContain('Informe o total')
    fireEvent.change(within(form).getByTestId('parcelar-quantidade'), { target: { value: '2' } })
    fireEvent.change(within(form).getByTestId('parcelar-primeiro'), { target: { value: '2026-12-10' } })
    fireEvent.click(within(form).getByTestId('parcelar-salvar'))
    await waitFor(() => expect(rpc).toHaveBeenCalledWith('gerar_parcelas', { p_caso: 'c3', p_quantidade: 2, p_primeiro: '2026-12-10', p_valor_total: 800 }))
    expect(n(screen.getByTestId('msg-parcelas').textContent)).toContain('2 parcelas de Revisão C a partir de 10/12/2026')
    expect(screen.queryByTestId('form-parcelar')).toBeNull()
  })
})
