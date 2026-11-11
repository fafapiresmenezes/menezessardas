// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

let salvas: object[] = []
const insert = vi.fn(async (_r: object): Promise<{ error: { message: string } | null }> => ({ error: null }))
const update = vi.fn(async (_r: object) => ({}))
const del = vi.fn(async () => ({}))
const invoke = vi.fn(async (_f: string, _o?: object): Promise<{ data: unknown; error: unknown }> => ({ data: null, error: null }))
vi.mock('@/lib/supabase', () => ({
  supabaseConfigurado: true,
  supabase: {
    from: (t: string) => t === 'tarefas'
      ? { select: () => ({ eq: () => ({ neq: () => ({ order: () => ({ limit: () => Promise.resolve({ data: [{ id: 'c1', titulo: 'Despejo Rua A' }] }) }) }) }) }) }
      : { select: () => ({ order: async () => ({ data: salvas }) }), insert: (r: object) => insert(r), update: (r: object) => ({ eq: async () => { await update(r); return {} } }), delete: () => ({ eq: async () => { await del(); return {} } }) },
    functions: { invoke: (f: string, o?: object) => invoke(f, o) },
  },
}))
vi.mock('@/components/Layout', () => ({ default: ({ title, children }: { title: string; children: React.ReactNode }) => <div><h1>{title}</h1>{children}</div> }))
const { default: FontesPage } = await import('./FontesPage')

describe('Fontes do advogado', () => {
  beforeEach(() => { cleanup(); salvas = []; insert.mockClear(); update.mockClear(); del.mockClear(); invoke.mockReset().mockImplementation(async () => ({ data: null, error: null })); localStorage.clear() })

  it('10 fontes abrem já com o termo; termo lembrado; botões só habilitam com 4 letras', async () => {
    render(<MemoryRouter><FontesPage /></MemoryRouter>)
    expect(screen.getAllByTestId('fonte').length).toBe(10)
    expect(screen.getByTestId('contador-fontes').textContent).toContain('10 fontes públicas e gratuitas; cada cartão')
    const botao = screen.getByTestId('buscar-gratis') as HTMLButtonElement
    expect(botao.disabled).toBe(true)
    fireEvent.change(screen.getByLabelText('O que você quer procurar?'), { target: { value: 'Maria Silva' } })
    expect(botao.disabled).toBe(false)
    expect(localStorage.getItem('lsm-fontes-termo')).toBe('Maria Silva')
    expect(screen.getByTestId('contador-fontes').textContent).toContain('todas prontas para "Maria Silva"')
    expect(screen.getAllByTestId('fonte')[1].getAttribute('href')).toBe('https://www.jusbrasil.com.br/busca?q=Maria%20Silva')
    expect(screen.getByText('Ligada à plataforma: Perfil do julgador')).toBeTruthy()
  })

  it('Enter busca nas fontes públicas e lista comunicações e diários; erro vira alerta; Escavador lista processos com copiar número', async () => {
    const write = vi.fn(async (_t: string) => undefined); Object.assign(navigator, { clipboard: { writeText: write } })
    invoke.mockResolvedValueOnce({ data: { tipo: 'nome', comunica: { ok: true, total: 1, itens: [{ numero: '0001-11', tribunal: 'TJRJ', data: '2026-10-20', tipo: 'Intimação', trecho: 'trecho A' }] }, queridoDiario: { ok: true, total: 1, itens: [{ data: '2026-10-21', municipio: 'Rio de Janeiro', link: 'https://qd/1', trecho: 'trecho B' }] } }, error: null })
    render(<MemoryRouter><FontesPage /></MemoryRouter>)
    fireEvent.change(screen.getByLabelText('O que você quer procurar?'), { target: { value: 'Maria Silva' } })
    fireEvent.submit(screen.getByTestId('form-termo'))
    await waitFor(() => expect(screen.getByTestId('resultado-gratis').textContent).toContain('Comunicações processuais (CNJ, últimos 12 meses): 1'))
    expect(invoke).toHaveBeenCalledWith('buscar-partes', expect.objectContaining({ body: { termo: 'Maria Silva' } }))
    expect(screen.getByText('trecho B')).toBeTruthy()
    expect(screen.getByText('abrir diário').getAttribute('href')).toBe('https://qd/1')
    invoke.mockResolvedValueOnce({ data: { erro: 'CNJ fora do ar' }, error: null })
    fireEvent.click(screen.getByTestId('buscar-gratis'))
    await waitFor(() => expect(screen.getByRole('alert').textContent).toBe('CNJ fora do ar'))
    invoke.mockResolvedValueOnce({ data: { processos: [{ numero: '0002-22', titulo: 'Maria x Banco', tribunal: 'TJSP', ultimaMovimentacao: '2026-10-01T12:00:00Z', classe: 'Cível', link: 'https://trib/2' }] }, error: null })
    fireEvent.click(screen.getByText('Buscar processos no Escavador aqui'))
    await waitFor(() => expect(screen.getByText('1 processo(s) encontrado(s):')).toBeTruthy())
    fireEvent.click(screen.getByTestId('copiar-numero'))
    expect(write).toHaveBeenCalledWith('0002-22')
  })

  it('salvar busca repete todo dia (primeira rodada imediata); duplicada avisa; ligar a caso e apagar; copiar buscas salvas', async () => {
    const write = vi.fn(async (_t: string) => undefined); Object.assign(navigator, { clipboard: { writeText: write } })
    salvas = [{ id: 's1', termo: 'Maria Silva', ultima_execucao: '2026-11-01T10:00:00Z', ultimo_total: 3, novas_ultima: 1, caso_id: null }]
    render(<MemoryRouter><FontesPage /></MemoryRouter>)
    await waitFor(() => expect(screen.getByText('Maria Silva')).toBeTruthy())
    expect(screen.getByText(/última rodada 01\/11\/2026 · 3 comunicação\(ões\) no ano · 1 nova\(s\)/)).toBeTruthy()
    fireEvent.change(screen.getByLabelText('O que você quer procurar?'), { target: { value: 'João Souza' } })
    fireEvent.click(screen.getByTestId('salvar-busca'))
    await waitFor(() => expect(screen.getByTestId('msg-salva').textContent).toContain('Busca salva. Ela será repetida todo dia às 7h15'))
    expect(insert).toHaveBeenCalledWith({ termo: 'João Souza' })
    await waitFor(() => expect(invoke).toHaveBeenCalledWith('buscar-partes', expect.objectContaining({ body: { salvas: true } })))
    insert.mockResolvedValueOnce({ error: { message: 'duplicate key value' } })
    fireEvent.click(screen.getByTestId('salvar-busca'))
    await waitFor(() => expect(screen.getByTestId('msg-salva').textContent).toBe('Essa busca já está salva.'))
    const sel = screen.getByTestId('busca-caso')
    await waitFor(() => expect(sel.querySelectorAll('option').length).toBe(2))
    fireEvent.change(sel, { target: { value: 'c1' } })
    await waitFor(() => expect(update).toHaveBeenCalledWith({ caso_id: 'c1' }))
    fireEvent.click(screen.getByTestId('copiar-salvas'))
    await waitFor(() => expect(screen.getByTestId('copiar-salvas').textContent).toBe('Buscas copiadas'))
    expect(write.mock.calls[0][0]).toContain('Buscas salvas no Comunica PJe — 1')
    fireEvent.click(screen.getByLabelText('Apagar busca Maria Silva'))
    await waitFor(() => expect(del).toHaveBeenCalled())
  })
})
