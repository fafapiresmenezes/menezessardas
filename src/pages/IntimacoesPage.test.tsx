// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

const hoje = new Date(); const iso = (d: number) => new Date(hoje.getTime() + d * 86400000).toISOString().slice(0, 10)
let lista: object[] = []
const update = vi.fn(async () => ({}))
const invoke = vi.fn(async (_f: string, _o?: object): Promise<{ data: unknown; error: unknown }> => ({ data: { novas: 2, oabs: ['123456/RJ'], falhas: [] }, error: null }))
const rpc = vi.fn(async (_f: string, _p?: object): Promise<{ data: unknown; error: { message: string } | null }> => ({ data: 77, error: null }))
vi.mock('@/lib/supabase', () => ({
  supabaseConfigurado: true,
  supabase: {
    from: () => ({ select: () => ({ order: () => ({ limit: async () => ({ data: lista }) }) }), update: () => ({ eq: async () => { await update(); return {} } }) }),
    functions: { invoke: (f: string, o?: object) => invoke(f, o) },
    rpc: (f: string, p?: object) => rpc(f, p),
  },
}))
vi.mock('@/lib/equipe', () => ({ perfilAtual: async () => 'admin' }))
vi.mock('@/components/Layout', () => ({ default: ({ title, children }: { title: string; children: React.ReactNode }) => <div><h1>{title}</h1>{children}</div> }))
const { default: IntimacoesPage } = await import('./IntimacoesPage')

const base = { oab: '123456/RJ', tribunal: 'TJRJ', orgao: '3ª Vara Cível', tipo: 'Intimação', classe: 'Despejo', texto: 'Texto da publicação', link: 'https://exemplo/1', tarefa_id: null }
describe('Caixa de intimações', () => {
  beforeEach(() => { cleanup(); update.mockClear(); rpc.mockClear(); invoke.mockReset().mockImplementation(async () => ({ data: { novas: 2, oabs: ['123456/RJ'], falhas: [] }, error: null })); localStorage.clear()
    lista = [
      { ...base, id: 1, numero_processo: '0001-11', data_disponibilizacao: iso(-1), lida: false, prazo_dias: 15, prazo_final: iso(1) },
      { ...base, id: 2, numero_processo: '0002-22', data_disponibilizacao: iso(-3), lida: false, prazo_dias: 5, prazo_final: iso(-2) },
      { ...base, id: 3, numero_processo: '0003-33', data_disponibilizacao: iso(-10), lida: true, prazo_dias: 15, prazo_final: iso(20) },
    ] })

  it('resumo por urgência, vencidas primeiro, filtro lembrado e busca; marcar como lida tira da lista', async () => {
    render(<MemoryRouter><IntimacoesPage /></MemoryRouter>)
    await waitFor(() => expect(screen.getAllByText(/^Processo /).length).toBe(2))
    const resumo = screen.getByTestId('resumo-urgencia').textContent!
    expect(resumo).toContain('1 vencida(s)'); expect(resumo).toContain('1 crítica(s)')
    const itens = screen.getAllByRole('listitem')
    expect(itens[0].textContent).toContain('0002-22'); expect(itens[0].textContent).toContain('Prazo vencido')
    fireEvent.change(screen.getByTestId('filtro-intimacoes'), { target: { value: 'todas' } })
    expect(screen.getAllByRole('listitem').length).toBe(3)
    expect(localStorage.getItem('lsm-intimacoes-filtro')).toBe('todas')
    fireEvent.change(screen.getByTestId('busca-intimacoes'), { target: { value: '0003' } })
    expect(screen.getAllByRole('listitem').length).toBe(1)
    fireEvent.change(screen.getByTestId('busca-intimacoes'), { target: { value: '' } })
    fireEvent.change(screen.getByTestId('filtro-intimacoes'), { target: { value: 'urgentes' } })
    expect(screen.getAllByRole('listitem').length).toBe(2)
    fireEvent.click(within(screen.getAllByRole('listitem')[0]).getByText('Marcar como lida'))
    expect(update).toHaveBeenCalled()
    expect(screen.getByTestId('resumo-urgencia').textContent).toContain('0 vencida(s)')
  })

  it('Buscar agora chama o CNJ e informa as novas; OABs salvas via RPC; erro do CNJ vira alerta', async () => {
    render(<MemoryRouter><IntimacoesPage /></MemoryRouter>)
    await waitFor(() => expect(screen.getAllByRole('listitem').length).toBe(2))
    fireEvent.click(screen.getByText('Buscar agora'))
    await waitFor(() => expect(screen.getByRole('status').textContent).toContain('2 intimação(ões) nova(s) nos últimos 30 dias para 123456/RJ'))
    expect(invoke).toHaveBeenCalledWith('intimacoes', expect.objectContaining({ body: { dias: 30 } }))
    const oab = await screen.findByPlaceholderText('123456/RJ, 98765/RJ')
    expect((screen.getByText('Salvar OABs') as HTMLButtonElement).disabled).toBe(true)
    fireEvent.change(oab, { target: { value: '111/RJ' } })
    fireEvent.click(screen.getByText('Salvar OABs'))
    await waitFor(() => expect(rpc).toHaveBeenCalledWith('definir_configuracao', { p_chave: 'oabs_monitoradas', p_valor: '111/RJ' }))
    invoke.mockResolvedValueOnce({ data: { erro: 'CNJ indisponível' }, error: null })
    fireEvent.click(screen.getByText('Buscar agora'))
    await waitFor(() => expect(screen.getByRole('alert').textContent).toBe('CNJ indisponível'))
  })

  it('ler abre o texto; criar tarefa usa a RPC e vira link para o caso; copiar resumo e baixar CSV', async () => {
    const write = vi.fn(async (_t: string) => undefined); Object.assign(navigator, { clipboard: { writeText: write } })
    URL.createObjectURL = vi.fn(() => 'blob:x'); URL.revokeObjectURL = vi.fn()
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined)
    render(<MemoryRouter><IntimacoesPage /></MemoryRouter>)
    await waitFor(() => expect(screen.getAllByRole('listitem').length).toBe(2))
    fireEvent.click(within(screen.getAllByRole('listitem')[0]).getByText('Ler'))
    expect(screen.getByText('Texto da publicação')).toBeTruthy()
    fireEvent.click(screen.getByTestId('criar-tarefa-2'))
    await waitFor(() => expect(screen.getByText('tarefa criada no caso').getAttribute('href')).toBe('#/projetos'))
    expect(rpc).toHaveBeenCalledWith('criar_tarefa_intimacao', { p_id: 2 })
    fireEvent.click(screen.getByTestId('copiar-intimacoes'))
    expect(write.mock.calls[0][0]).toContain('VENCIDA · 0002-22 · TJRJ')
    fireEvent.click(screen.getByTestId('baixar-intimacoes'))
    expect(click).toHaveBeenCalled()
    expect(screen.getByTestId('baixar-intimacoes').textContent).toBe('Baixado')
    click.mockRestore()
  })
})
