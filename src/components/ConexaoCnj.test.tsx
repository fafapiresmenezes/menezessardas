// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'

let valor: string | null = null
let falha = false
const invoke = vi.fn(async (_f: string, _o?: object): Promise<{ data: unknown; error: unknown }> => ({ data: { conexao: true, status: 200 }, error: null }))
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => { if (falha) throw new Error('sem permissão'); return { data: valor ? { valor } : null } } }) }) }),
    functions: { invoke: (f: string, o?: object) => invoke(f, o) },
  },
}))
const { default: ConexaoCnj } = await import('./ConexaoCnj')
const reg = (h: number, extra: object = {}) => JSON.stringify({ em: new Date(Date.now() - h * 3600000).toISOString(), ok: true, origem: 'automatica', ...extra })

describe('Painel da conexão com o CNJ', () => {
  beforeEach(() => { cleanup(); valor = null; falha = false; invoke.mockClear() })

  it('consulta recente: conectado', async () => {
    valor = reg(2)
    render(<ConexaoCnj />)
    await waitFor(() => expect(screen.getByTestId('conexao-cnj').dataset.situacao).toBe('ok'))
    expect(screen.getByTestId('conexao-cnj').textContent).toContain('Conectado ao CNJ')
  })
  it('robô parado há mais de 24 h: atenção; sem permissão de leitura: sem registro, sem quebrar', async () => {
    valor = reg(30)
    render(<ConexaoCnj />)
    await waitFor(() => expect(screen.getByTestId('conexao-cnj').dataset.situacao).toBe('falha'))
    cleanup(); falha = true
    render(<ConexaoCnj />)
    expect(screen.getByTestId('conexao-cnj').dataset.situacao).toBe('sem_dados')
  })
  it('testar conexão: sucesso, falha do CNJ e função antiga/ausente', async () => {
    render(<ConexaoCnj />)
    fireEvent.click(screen.getByTestId('testar-conexao-cnj'))
    expect((await screen.findByTestId('resultado-teste-cnj')).textContent).toContain('funcionando')
    expect(invoke.mock.calls[0][1]).toMatchObject({ body: { teste: true } })
    invoke.mockResolvedValueOnce({ data: { conexao: false, status: 503 }, error: null })
    fireEvent.click(screen.getByTestId('testar-conexao-cnj'))
    await waitFor(() => expect(screen.getByTestId('resultado-teste-cnj').textContent).toContain('503'))
    invoke.mockResolvedValueOnce({ data: { novas: 0 }, error: null })
    fireEvent.click(screen.getByTestId('testar-conexao-cnj'))
    await waitFor(() => expect(screen.getByTestId('resultado-teste-cnj').textContent).toContain('implantada e atualizada'))
  })
})
