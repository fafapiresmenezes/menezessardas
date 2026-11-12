// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup, within } from '@testing-library/react'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'

const pad = (n: number) => String(n).padStart(2, '0')
const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const hoje = new Date()
const mais = (n: number) => { const d = new Date(hoje); d.setDate(d.getDate() + n); return d }
const amanha = mais(1), em3 = mais(3)
const alertas = [
  { id: 'a1', imovelId: 'im1', imovel: 'Av. Atlântica, 1000', tipo: 'vencimento', titulo: 'Vencimento do contrato', dataEvento: iso(amanha), diasRestantes: 1 },
  { id: 'comp-1', imovelId: '', imovel: 'Rua das Laranjeiras, 50', tipo: 'compromisso', titulo: 'Vistoria', dataEvento: iso(em3), diasRestantes: 3 },
]
const recarregar = vi.fn(async () => undefined)
const salvarCompromisso = vi.fn(async (_c: object) => undefined)
const importarCompromissosIcs = vi.fn(async (_e: object[]) => ({ criados: 1, repetidos: 0 }))
vi.mock('@/hooks/useAlertas', () => ({
  useAlertas: () => ({ alertas, loading: false, error: null, getCriticos: () => 2, recarregar }),
  salvarCompromisso: (c: object) => salvarCompromisso(c),
  importarCompromissosIcs: (e: object[]) => importarCompromissosIcs(e),
}))
const invoke = vi.fn(async (_f: string, _o?: object): Promise<{ data?: unknown; error: { message: string } | null }> => ({ data: {}, error: null }))
const rpc = vi.fn(async (_f: string, _p?: object): Promise<{ data?: unknown; error: { message: string } | null }> => ({ data: null, error: null }))
const upsert = vi.fn(async (_r: object, _o?: object) => ({ error: null }))
vi.mock('@/lib/supabase', () => ({
  supabaseConfigurado: true,
  supabase: {
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { valor: JSON.stringify({ enviado_em: '2026-10-30T10:00:00Z', para: ['fatima@gmenezes.com'], resultado: 'pendente' }) } }) }) }), upsert: (r: object, o?: object) => upsert(r, o) }),
    rpc: (f: string, p?: object) => rpc(f, p),
    functions: { invoke: (f: string, o?: object) => invoke(f, o) },
  },
}))
vi.mock('@/components/Layout', () => ({ default: ({ title, children }: { title: string; children: React.ReactNode }) => <div><h1>{title}</h1>{children}</div> }))
const { default: AgendaPage } = await import('./AgendaPage')

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
function Onde() { const l = useLocation(); return <p data-testid="onde">{l.pathname}</p> }
const montar = () => render(<MemoryRouter initialEntries={['/agenda']}><Routes><Route path="/agenda" element={<AgendaPage />} /><Route path="/contrato/:id" element={<Onde />} /></Routes></MemoryRouter>)
const texto = (s: string | null | undefined) => (s ?? '').replace(/ /g, ' ')

describe('Agenda', () => {
  beforeEach(() => {
    cleanup(); recarregar.mockClear(); salvarCompromisso.mockClear(); invoke.mockReset().mockResolvedValue({ data: {}, error: null }); rpc.mockReset().mockResolvedValue({ data: null, error: null }); upsert.mockClear()
    window.alert = vi.fn(); window.print = vi.fn()
    Object.assign(navigator, { clipboard: { writeText: vi.fn(async (_t: string) => undefined) } })
  })

  it('mês atual, resumo dos 7 dias, lista do mês, navegação entre meses, "hoje" e ida ao contrato', async () => {
    montar()
    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe(`${MESES[hoje.getMonth()]} de ${hoje.getFullYear()}`)
    expect(texto(screen.getByTestId('resumo-semana').textContent)).toContain('Próximos 7 dias: 2 compromissos; o primeiro é Vencimento do contrato amanhã')
    const mesAtual = screen.getByRole('region', { name: `Compromissos de ${MESES[hoje.getMonth()]}` })
    if (amanha.getMonth() === hoje.getMonth()) expect(within(mesAtual).getByText('Vencimento do contrato')).toBeTruthy()
    fireEvent.click(screen.getByTestId('copiar-semana'))
    await waitFor(() => expect(screen.getByTestId('copiar-semana').textContent).toBe('semana copiada'))
    const copiado = (navigator.clipboard.writeText as ReturnType<typeof vi.fn>).mock.calls[0]![0] as string
    expect(copiado).toContain('Próximos 7 dias — THEYE Institute')
    expect(copiado).toContain('Vistoria (Rua das Laranjeiras, 50)')
    fireEvent.click(screen.getByTestId('imprimir-agenda'))
    expect(window.print).toHaveBeenCalled()
    expect(screen.getAllByTestId('agenda-hoje')).toHaveLength(1)
    fireEvent.click(screen.getByLabelText('Próximo mês'))
    const prox = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 1)
    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe(`${MESES[prox.getMonth()]} de ${prox.getFullYear()}`)
    expect(screen.getAllByTestId('agenda-hoje')).toHaveLength(2)
    fireEvent.click(screen.getAllByTestId('agenda-hoje')[0]!)
    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe(`${MESES[hoje.getMonth()]} de ${hoje.getFullYear()}`)
    expect(screen.getAllByTestId('agenda-hoje')).toHaveLength(1)
    fireEvent.click(screen.getByLabelText('Mês anterior'))
    const ant = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1)
    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe(`${MESES[ant.getMonth()]} de ${ant.getFullYear()}`)
    expect(screen.getByText('Nenhum compromisso neste mês')).toBeTruthy()
    fireEvent.click(screen.getAllByTestId('agenda-hoje')[0]!)
    fireEvent.click(screen.getAllByTitle('Vencimento do contrato — Av. Atlântica, 1000')[0]!)
    expect(screen.getByTestId('onde').textContent).toBe('/contrato/im1')
  })

  it('novo compromisso: valida título, imóvel e e-mail, grava com os avisos marcados e recarrega', async () => {
    montar()
    fireEvent.click(screen.getAllByTitle('Novo compromisso')[4]!)
    expect(screen.getByText('Novo Compromisso')).toBeTruthy()
    expect((screen.getByLabelText('Data do Vencimento') as HTMLInputElement).value).toBe(`${hoje.getFullYear()}-${pad(hoje.getMonth() + 1)}-05`)
    fireEvent.click(screen.getByText('Salvar Compromisso'))
    expect(window.alert).toHaveBeenCalledWith('Preencha título, imóvel e data')
    expect(salvarCompromisso).not.toHaveBeenCalled()
    fireEvent.change(screen.getByLabelText('Título do Compromisso'), { target: { value: 'Reunião com o locador' } })
    fireEvent.change(screen.getByLabelText('Imóvel'), { target: { value: 'Av. Atlântica, 1000' } })
    fireEvent.change(screen.getByLabelText(/E-mail para aviso/), { target: { value: 'fatima@' } })
    fireEvent.click(screen.getByText('Salvar Compromisso'))
    expect(window.alert).toHaveBeenCalledWith('Confira o e-mail para aviso. Para mais de um, separe por vírgula.')
    fireEvent.change(screen.getByLabelText(/E-mail para aviso/), { target: { value: 'fatima@gmenezes.com, helio@gmenezes.com' } })
    fireEvent.click(screen.getByRole('button', { name: '3 dias' }))
    expect(screen.getByRole('button', { name: '3 dias' }).getAttribute('aria-pressed')).toBe('true')
    fireEvent.click(screen.getByText('Salvar Compromisso'))
    await waitFor(() => expect(salvarCompromisso).toHaveBeenCalledWith({ titulo: 'Reunião com o locador', imovel: 'Av. Atlântica, 1000', dataEvento: `${hoje.getFullYear()}-${pad(hoje.getMonth() + 1)}-05`, diasAntes: 7, avisosDias: [7, 3], email: 'fatima@gmenezes.com, helio@gmenezes.com' }))
    expect(recarregar).toHaveBeenCalled()
    await waitFor(() => expect(screen.queryByText('Novo Compromisso')).toBeNull())
  })

  it('semana em PDF, roteiro do Outlook e resultado do teste da Fátima (sem botões de teste para o cliente)', async () => {
    rpc.mockImplementation(async (f: string) => f === 'semana_agenda' ? { data: { inicio: iso(amanha), fim: iso(mais(7)), total: 2, dias: [{ dia: iso(amanha), itens: [{ tipo: 'prazo', titulo: 'Contestação', detalhe: 'Caso 12', responsavel: 'Fátima' }, { tipo: 'compromisso', titulo: 'Vistoria', detalhe: '', responsavel: '' }] }] }, error: null } : { data: 'tok', error: null })
    invoke.mockImplementation(async (f: string) => f === 'semana-pdf' ? { data: { enviado: true, total: 2 }, error: null } : { data: { para: ['m@gmenezes.com'] }, error: null })
    const clique = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined)
    Object.assign(URL, { createObjectURL: vi.fn(() => 'blob:semana'), revokeObjectURL: vi.fn() })
    montar()
    await waitFor(() => expect(screen.getByTestId('resultado-outlook').textContent).toBe('pendente'))
    expect(screen.getByText('(roteiro enviado em 30/10/2026)')).toBeTruthy()
    fireEvent.click(screen.getByTestId('semana-pdf'))
    await waitFor(() => expect(screen.getByTestId('semana-msg').textContent).toBe('PDF da semana gerado (2 item(ns)). A secretaria recebe este PDF por e-mail toda sexta às 17h.'))
    expect(rpc).toHaveBeenCalledWith('semana_agenda', { p_inicio: iso(amanha), p_dias: 7 })
    expect(clique).toHaveBeenCalledTimes(1)
    // Botões de teste saíram da tela (pedido do M, 12/11/2026): cliente não testa.
    expect(screen.queryByTestId('semana-email-teste')).toBeNull()
    expect(screen.queryByTestId('enviar-roteiro-eu')).toBeNull()
    fireEvent.click(screen.getByTestId('enviar-roteiro-fatima'))
    await waitFor(() => expect(screen.getByTestId('msg-roteiro').textContent).toBe('Roteiro enviado para m@gmenezes.com.'))
    expect(invoke).toHaveBeenCalledWith('roteiro-outlook', { body: { para: 'fatima' } })
    fireEvent.click(screen.getByTestId('outlook-funcionou'))
    await waitFor(() => expect(screen.getByTestId('resultado-outlook').textContent).toBe('funcionou'))
    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({ chave: 'teste_outlook', valor: expect.stringContaining('"resultado":"funcionou"') }), { onConflict: 'chave' })
    clique.mockRestore()
  })
})
