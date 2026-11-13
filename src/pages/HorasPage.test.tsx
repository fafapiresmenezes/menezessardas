// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup, act } from '@testing-library/react'

let lista: object[] = []
let funcao = 'admin'
const insert = vi.fn(async (_r: object): Promise<{ error: { message: string } | null }> => ({ error: null }))
const upsert = vi.fn(async (_r: object, _o?: object): Promise<{ error: { message: string } | null }> => ({ error: null }))
const del = vi.fn(async () => ({}))
const rpc = vi.fn(async (_f: string, _p?: object) => ({ data: { meta: 120, horas: 30, esperado_hoje: 60, pct_mes: 25, pct_ritmo: 50, abaixo: true, dias_uteis_mes: 20, dias_uteis_ate_hoje: 10 } }))
vi.mock('@/lib/supabase', () => ({
  supabaseConfigurado: true,
  supabase: {
    from: (t: string) => t === 'metas_horas' ? { select: async () => ({ data: [{ papel: 'advogada', horas_mes: 120 }] }), upsert: (r: object, o?: object) => upsert(r, o) }
      : t === 'usuarios_perfis' ? { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { funcao } }) }) }) }
      : { select: () => ({ gte: () => ({ lt: () => ({ order: async () => ({ data: lista, error: null }) }) }) }), insert: (r: object) => insert(r), delete: () => ({ eq: async () => { await del(); return {} } }) },
    rpc: (f: string, p?: object) => rpc(f, p),
    auth: { getUser: async () => ({ data: { user: { id: 'u1' } } }) },
  },
}))
vi.mock('@/components/Layout', () => ({ default: ({ title, children }: { title: string; children: React.ReactNode }) => <div><h1>{title}</h1>{children}</div> }))
// Quem está olhando: sócio e gestor veem as horas do escritório; os demais, só as suas.
let alcance: { id: string; cargo: string | null; admin: boolean; veTudo: boolean } | null = { id: 'u1', cargo: 'socio', admin: false, veTudo: true }
vi.mock('@/lib/hierarquia', async (original) => ({
  ...(await original<typeof import('@/lib/hierarquia')>()),
  meuAlcance: async () => { if (!alcance) throw new Error('não deu para saber quem está logado'); return alcance },
}))
const { default: HorasPage } = await import('./HorasPage')

const mes = new Date().toISOString().slice(0, 7)
// Apagar agora pede confirmação: nos testes, a pessoa sempre confirma.
beforeEach(() => { vi.spyOn(window, 'confirm').mockReturnValue(true) })

describe('Horas trabalhadas', () => {
  beforeEach(() => { cleanup(); insert.mockClear(); upsert.mockClear(); del.mockClear(); rpc.mockClear(); localStorage.clear(); funcao = 'admin'
    lista = [
      { id: 'l1', data: `${mes}-03`, cliente: 'Ana', descricao: 'Petição', minutos: 90, valor_hora: '400', faturavel: true },
      { id: 'l2', data: `${mes}-02`, cliente: 'Bruno', descricao: 'Reunião', minutos: 60, valor_hora: '300', faturavel: false },
    ]
    alcance = { id: 'u1', cargo: 'socio', admin: false, veTudo: true } })

  // Privacidade por advogado: a hora lançada pelo colega não entra na tela de quem não é sócio nem gestor.
  it('júnior não vê a hora do colega; o sócio vê as duas', async () => {
    lista = [
      { id: 'l1', data: `${mes}-03`, cliente: 'Ana', descricao: 'Petição minha', minutos: 90, valor_hora: '400', faturavel: true, usuario_id: 'u1' },
      { id: 'l2', data: `${mes}-02`, cliente: 'Bruno', descricao: 'Reunião do colega', minutos: 60, valor_hora: '300', faturavel: false, usuario_id: 'u2' },
    ]
    alcance = { id: 'u1', cargo: 'junior', admin: false, veTudo: false }
    render(<HorasPage />)
    await waitFor(() => expect(screen.getByTestId('h-total').textContent).toBe('1h30'))
    expect(screen.getByText(/Petição minha/)).toBeTruthy()
    expect(screen.queryByText(/Reunião do colega/)).toBeNull()

    cleanup(); alcance = { id: 'u1', cargo: 'socio', admin: false, veTudo: true }
    render(<HorasPage />)
    await waitFor(() => expect(screen.getByTestId('h-total').textContent).toBe('2h30'))
    expect(screen.getByText(/Reunião do colega/)).toBeTruthy()
  })

  // Cargo que não dá para descobrir vale o alcance MAIS ESTREITO, nunca o mais largo.
  it('sem saber quem está logado, esconde as horas com dono em vez de mostrar todas', async () => {
    lista = [
      { id: 'l1', data: `${mes}-03`, cliente: 'Ana', descricao: 'Petição minha', minutos: 90, valor_hora: '400', faturavel: true, usuario_id: 'u1' },
      { id: 'l2', data: `${mes}-02`, cliente: 'Bruno', descricao: 'Reunião do colega', minutos: 60, valor_hora: '300', faturavel: false, usuario_id: 'u2' },
    ]
    alcance = null
    render(<HorasPage />)
    await waitFor(() => expect(screen.getByTestId('h-total').textContent).toBe('0h00'))
    expect(screen.queryByText(/Petição minha/)).toBeNull()
    expect(screen.queryByText(/Reunião do colega/)).toBeNull()
  })

  it('totais do mês e por cliente; meta por função com progresso; admin define meta; mês lembrado', async () => {
    render(<HorasPage />)
    await waitFor(() => expect(screen.getByTestId('h-total').textContent).toBe('2h30'))
    expect(screen.getByTestId('h-valor-total').textContent!.replace(/ /g, ' ')).toBe('R$ 600,00')
    expect(screen.getByText('60%')).toBeTruthy()
    await waitFor(() => expect(screen.getByTestId('meta-horas-mes').textContent).toBe('30h'))
    expect(screen.getByTestId('meta-pct').textContent).toBe('25% da meta · ritmo 50%')
    expect(screen.getByText(/Abaixo de 80% do ritmo/)).toBeTruthy()
    expect(rpc).toHaveBeenCalledWith('progresso_horas', { p_papel: 'advogada' })
    fireEvent.change(screen.getByTestId('meta-papel'), { target: { value: 'socia' } })
    await waitFor(() => expect(rpc).toHaveBeenCalledWith('progresso_horas', { p_papel: 'socia' }))
    expect(localStorage.getItem('lsm-papel')).toBe('socia')
    fireEvent.change(await screen.findByTestId('meta-valor'), { target: { value: '140' } })
    fireEvent.click(screen.getByTestId('meta-salvar'))
    await waitFor(() => expect(screen.getByTestId('msg-meta').textContent).toBe('Meta de Sócia salva: 140h por mês.'))
    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({ papel: 'socia', horas_mes: 140 }), { onConflict: 'papel' })
    fireEvent.change(screen.getByLabelText(/^Mês/), { target: { value: '2026-09' } })
    expect(localStorage.getItem('lsm-horas-mes')).toBe('2026-09')
  })

  it('lançar valida campos, grava minutos e valor; repetir último preenche; apagar; erro de leitor', async () => {
    render(<HorasPage />)
    await waitFor(() => expect(screen.getByTestId('h-total').textContent).toBe('2h30'))
    fireEvent.click(screen.getByTestId('h-salvar'))
    expect(screen.getByRole('alert').textContent).toBe('Preencha cliente, o que foi feito e as horas.')
    fireEvent.click(screen.getByTestId('h-repetir'))
    expect((screen.getByTestId('h-cliente') as HTMLInputElement).value).toBe('Ana')
    expect((screen.getByTestId('h-desc') as HTMLInputElement).value).toBe('Petição')
    fireEvent.change(screen.getByTestId('h-horas'), { target: { value: '1,5' } })
    fireEvent.click(screen.getByTestId('h-salvar'))
    await waitFor(() => expect(insert).toHaveBeenCalledWith(expect.objectContaining({ cliente: 'Ana', descricao: 'Petição', minutos: 90, valor_hora: 400, faturavel: true })))
    await waitFor(() => expect((screen.getByTestId('h-desc') as HTMLInputElement).value).toBe(''))
    fireEvent.change(screen.getByTestId('h-desc'), { target: { value: 'Outra' } }); fireEvent.change(screen.getByTestId('h-horas'), { target: { value: '1' } })
    insert.mockResolvedValueOnce({ error: { message: 'rls' } })
    fireEvent.click(screen.getByTestId('h-salvar'))
    await waitFor(() => expect(screen.getByRole('alert').textContent).toBe('Não foi possível salvar (leitores não lançam horas).'))
    fireEvent.click(screen.getAllByLabelText('Apagar lançamento')[0])
    await waitFor(() => expect(del).toHaveBeenCalled())
  })

  it('cronômetro conta e, ao parar, preenche as horas; resumo do mês copiado; baixar CSV', async () => {
    vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] })
    const write = vi.fn(async (_t: string) => undefined); Object.assign(navigator, { clipboard: { writeText: write } })
    URL.createObjectURL = vi.fn(() => 'blob:x'); URL.revokeObjectURL = vi.fn()
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined)
    render(<HorasPage />)
    await act(async () => { await Promise.resolve() })
    fireEvent.click(screen.getByTestId('cronometro'))
    expect(localStorage.getItem('lsm-cronometro')).toBeTruthy()
    await act(async () => { await vi.advanceTimersByTimeAsync(30 * 60000 + 1000) })
    expect(screen.getByTestId('cronometro').textContent).toContain('Parar (0h30)')
    fireEvent.click(screen.getByTestId('cronometro'))
    expect((screen.getByTestId('h-horas') as HTMLInputElement).value).toBe('0.50')
    expect(localStorage.getItem('lsm-cronometro')).toBeNull()
    vi.useRealTimers()
    await waitFor(() => expect(screen.getByTestId('h-total').textContent).toBe('2h30'))
    fireEvent.click(screen.getByTestId('copiar-resumo'))
    await waitFor(() => expect(screen.getByTestId('copiar-resumo').textContent).toBe('Resumo copiado'))
    const t = write.mock.calls[0][0].replace(/ /g, ' ')
    expect(t).toContain('Total: 2h30 (1h30 faturáveis) · a faturar: R$ 600,00')
    expect(t).toContain('• Ana: 1h30 faturáveis = R$ 600,00')
    expect(t).toContain('• Bruno: 0h00 faturáveis = R$ 0,00 (+ 1h00 não faturáveis)')
    fireEvent.click(screen.getByTestId('baixar-horas'))
    expect(click).toHaveBeenCalled()
    expect(screen.getByTestId('baixar-horas').textContent).toBe('Baixado')
    click.mockRestore()
  })
})
