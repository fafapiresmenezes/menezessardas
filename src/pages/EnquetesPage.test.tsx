// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

let funcao: 'admin' | 'operador' = 'operador'
let enquetes: object[] = []
let meusVotos: object[] = []
let resultado: object | null = null
const insertVoto = vi.fn(async (_l: object) => ({ error: null as unknown }))
const insertEnquete = vi.fn(async (_l: object) => ({ error: null as unknown }))
vi.mock('@/lib/equipe', () => ({ perfilAtual: async () => funcao }))
vi.mock('@/lib/supabase', () => ({
  supabaseConfigurado: true,
  supabase: {
    from: (t: string) => t === 'enquetes'
      ? { select: () => ({ order: () => ({ limit: async () => ({ data: enquetes }) }) }), insert: (l: object) => insertEnquete(l) }
      : { select: async () => ({ data: meusVotos }), insert: (l: object) => insertVoto(l) },
    rpc: async () => ({ data: resultado }),
  },
}))
vi.mock('@/components/Layout', () => ({ default: ({ title, children }: { title: string; children: React.ReactNode }) => <div><h1>{title}</h1>{children}</div> }))
const { default: EnquetesPage } = await import('./EnquetesPage')
const E1 = { id: 1, tema: 'IA no Judiciário', pergunta: 'O juiz deve declarar quando usou IA na decisão?', opcoes: ['Sim, sempre', 'Só se pedido', 'Não'], publica: true, aberta_ate: '2030-01-01T00:00:00Z', criado_em: '2026-11-06T00:00:00Z' }

describe('Enquetes (B14)', () => {
  beforeEach(() => { cleanup(); funcao = 'operador'; enquetes = []; meusVotos = []; resultado = null; insertVoto.mockClear(); insertEnquete.mockClear() })

  it('sem enquetes mostra o vazio; operador não vê o botão de criar', async () => {
    render(<MemoryRouter><EnquetesPage /></MemoryRouter>)
    await waitFor(() => expect(screen.getByTestId('enquetes-vazio')).toBeTruthy())
    expect(screen.queryByTestId('nova-enquete')).toBeNull()
  })

  it('quem não votou vê as opções; votar grava só enquete e opção; depois vê o agregado com n, margem e intervalos', async () => {
    enquetes = [E1]
    render(<MemoryRouter><EnquetesPage /></MemoryRouter>)
    await waitFor(() => expect(screen.getByTestId('enquete-1')).toBeTruthy())
    expect(screen.queryByTestId('resultado-1')).toBeNull()
    meusVotos = [{ enquete_id: 1, opcao: 0 }]; resultado = { enquete_id: 1, n: 20, contagens: [11, 9, 0] }
    fireEvent.click(screen.getByRole('button', { name: 'Sim, sempre' }))
    await waitFor(() => expect(screen.getByTestId('resultado-1')).toBeTruthy())
    expect(insertVoto).toHaveBeenCalledWith({ enquete_id: 1, opcao: 0 })
    expect(screen.getByRole('status').textContent).toContain('ninguém vê o seu voto')
    const texto = screen.getByTestId('resultado-1').textContent!
    expect(texto).toContain('(seu voto)')
    expect(texto).toContain('20 votos')
    expect(texto).toContain('±21.9 pontos')
    expect(texto).toContain('empate técnico')
  })

  it('enquete encerrada mostra resultado mesmo sem voto; líder só quando os intervalos não se cruzam', async () => {
    enquetes = [{ ...E1, aberta_ate: '2020-01-01T00:00:00Z' }]; resultado = { enquete_id: 1, n: 200, contagens: [150, 30, 20] }
    render(<MemoryRouter><EnquetesPage /></MemoryRouter>)
    await waitFor(() => expect(screen.getByTestId('resultado-1')).toBeTruthy())
    expect(screen.getByTestId('resultado-1').textContent).toContain('à frente: Sim, sempre')
    expect(screen.getByText('encerrada')).toBeTruthy()
  })

  it('admin cria enquete com validação; pública e prazo em dias', async () => {
    funcao = 'admin'
    render(<MemoryRouter><EnquetesPage /></MemoryRouter>)
    await waitFor(() => expect(screen.getByTestId('nova-enquete')).toBeTruthy())
    fireEvent.click(screen.getByTestId('nova-enquete'))
    fireEvent.click(screen.getByRole('button', { name: 'Criar enquete' }))
    expect(screen.getByRole('alert').textContent).toContain('tema')
    fireEvent.change(screen.getByLabelText('Tema'), { target: { value: 'Locação' } })
    fireEvent.change(screen.getByLabelText('Pergunta'), { target: { value: 'A Lei do Inquilinato precisa de reforma?' } })
    fireEvent.change(screen.getByLabelText('Opção 1'), { target: { value: 'Sim' } })
    fireEvent.change(screen.getByLabelText('Opção 2'), { target: { value: 'Não' } })
    fireEvent.click(screen.getByLabelText(/Pública no site/))
    fireEvent.click(screen.getByRole('button', { name: 'Criar enquete' }))
    await waitFor(() => expect(insertEnquete).toHaveBeenCalled())
    const l = insertEnquete.mock.calls[0][0] as { tema: string; opcoes: string[]; publica: boolean; aberta_ate: string }
    expect(l).toMatchObject({ tema: 'Locação', opcoes: ['Sim', 'Não'], publica: true })
    expect(new Date(l.aberta_ate).getTime()).toBeGreaterThan(Date.now() + 13 * 86400000)
  })
})
