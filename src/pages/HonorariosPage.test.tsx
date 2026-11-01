// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup, within } from '@testing-library/react'

const hoje = new Date(); const iso = (d: number) => new Date(hoje.getTime() + d * 86400000).toISOString().slice(0, 10)
let casos: object[] = []
let pagamentos: object[] = []
const insert = vi.fn(async (_r: object): Promise<{ error: { message: string } | null }> => ({ error: null }))
const update = vi.fn(async (_r: object): Promise<{ error: { message: string } | null }> => ({ error: null }))
const del = vi.fn(async () => ({}))
vi.mock('@/lib/supabase', () => ({
  supabaseConfigurado: true,
  supabase: { from: (t: string) => t === 'tarefas'
    ? { select: () => ({ eq: () => ({ order: async () => ({ data: casos, error: null }) }) }), update: (r: object) => ({ eq: async () => update(r) }) }
    : t === 'lancamentos_horas' ? { select: async () => ({ data: [{ cliente: 'Ana', minutos: 120, valor_hora: 300 }] }) }
    : { select: () => ({ order: async () => ({ data: pagamentos }) }), insert: (r: object) => insert(r), delete: () => ({ eq: async () => { await del(); return {} } }) } },
}))
vi.mock('@/components/Layout', () => ({ default: ({ title, children }: { title: string; children: React.ReactNode }) => <div><h1>{title}</h1>{children}</div> }))
vi.mock('@/components/CobrancaPix', () => ({ default: ({ valor, caso }: { valor: number; caso: string }) => <div data-testid="pix-stub">{caso} {valor}</div> }))
const { default: HonorariosPage } = await import('./HonorariosPage')
const n = (s: string | null | undefined) => (s ?? '').replace(/ /g, ' ')

describe('Honorários e rentabilidade', () => {
  beforeEach(() => { cleanup(); insert.mockClear(); update.mockClear(); del.mockClear(); pagamentos = []
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
    expect(screen.getByTestId('pix-stub').textContent).toBe('Despejo Rua A 3000')
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
})
