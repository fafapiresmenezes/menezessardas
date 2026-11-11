// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

let pesquisas: object[] = []
const insert = vi.fn(async (_r: object) => ({ error: null as { message: string } | null }))
const update = vi.fn(async (_r: object) => ({ eq: async () => ({}) }))
const del = vi.fn(async () => ({}))
vi.mock('@/lib/supabase', () => ({
  supabaseConfigurado: true,
  supabase: {
    from: (tabela: string) => tabela === 'tarefas'
      ? { select: () => ({ is: () => ({ order: () => ({ limit: () => Promise.resolve({ data: [{ id: 'c1', titulo: 'Despejo Rua A', cliente: 'Alfa' }] }) }) }) }) }
      : {
        select: () => ({ order: async () => ({ data: pesquisas }) }),
        insert: (r: object) => insert(r),
        update: (r: object) => ({ eq: async () => { await update(r); return {} } }),
        delete: () => ({ eq: async () => { await del(); return {} } }),
      },
  },
}))
const perguntar = vi.fn(async () => ({ resposta: 'Nota comparada EUA/UE.' }))
vi.mock('@/lib/assistente', () => ({ perguntar: (...a: unknown[]) => perguntar(...(a as [])) }))
const { default: PesquisaDireito } = await import('./PesquisaDireito')
const montar = () => render(<MemoryRouter><PesquisaDireito /></MemoryRouter>)

// Apagar agora pede confirmação: nos testes, a pessoa sempre confirma.
beforeEach(() => { vi.spyOn(window, 'confirm').mockReturnValue(true) })

describe('Pesquisa e desenvolvimento do direito (THEYE Institute)', () => {
  beforeEach(() => { cleanup(); pesquisas = []; insert.mockClear(); update.mockClear(); del.mockClear(); perguntar.mockClear() })

  it('o tema digitado entra na busca de cada fonte gratuita e no pedido ao pesquisador', async () => {
    montar()
    expect(screen.getAllByTestId('fonte-br').length).toBe(6)
    expect(screen.getAllByTestId('fonte-mundo').length).toBe(9)
    fireEvent.change(screen.getByLabelText('Tema da pesquisa'), { target: { value: 'despejo liminar' } })
    const stj = screen.getAllByTestId('fonte-br')[1] as HTMLAnchorElement
    expect(stj.href).toContain('scon.stj.jus.br')
    expect(stj.href).toContain('despejo%20liminar')
    expect(stj.rel).toBe('noopener noreferrer')
    expect((screen.getByTestId('agente-pesquisa') as HTMLAnchorElement).getAttribute('href')).toContain('agente=pesquisa&pedido=')
    expect(await screen.findByText('Nenhuma pesquisa registrada ainda.')).toBeTruthy()
  })

  it('registrar pesquisa grava no programa do Instituto com caso relacionado e limpa o formulário', async () => {
    montar()
    await screen.findByText('Nenhuma pesquisa registrada ainda.')
    fireEvent.change(screen.getByLabelText('Título'), { target: { value: 'Não concorrência' } })
    fireEvent.change(screen.getByLabelText('Pergunta de pesquisa'), { target: { value: 'Como EUA e UE tratam a cláusula?' } })
    await waitFor(() => expect(screen.getByLabelText('Caso relacionado (opcional)').querySelectorAll('option').length).toBe(2))
    fireEvent.change(screen.getByLabelText('Caso relacionado (opcional)'), { target: { value: 'c1' } })
    fireEvent.submit(screen.getByTestId('form-pesquisa'))
    await waitFor(() => expect(insert).toHaveBeenCalledWith({ titulo: 'Não concorrência', pergunta: 'Como EUA e UE tratam a cláusula?', origem: 'caso interno', caso_id: 'c1', jurisdicoes: 'Brasil, EUA, União Europeia' }))
    expect((await screen.findByTestId('msg-pesquisa')).textContent).toBe('Pesquisa registrada no programa do Instituto.')
    expect((screen.getByLabelText('Título') as HTMLInputElement).value).toBe('')
  })

  it('gerar nota chama o pesquisador com título, pergunta e jurisdições, marca em andamento e depois concluída; apagar remove', async () => {
    pesquisas = [{ id: 'p1', titulo: 'Caução', pergunta: 'Limite da caução?', origem: 'mundo', caso_id: null, jurisdicoes: 'Brasil, Portugal', status: 'aberta', nota: null, nota_em: null, criado_em: '2026-11-01T00:00:00Z' }]
    montar()
    const item = await screen.findByText('Caução')
    expect(item.parentElement!.textContent).toContain('aberta')
    fireEvent.click(screen.getByTestId('gerar-nota'))
    await waitFor(() => expect(perguntar).toHaveBeenCalled())
    const pedido = (perguntar.mock.calls[0] as unknown as string[])[0]
    expect(pedido).toContain('"Caução"')
    expect(pedido).toContain('Limite da caução?')
    expect(pedido).toContain('Brasil, Portugal')
    await waitFor(() => expect(update).toHaveBeenCalledTimes(2))
    expect(update.mock.calls[0][0]).toEqual({ status: 'em andamento' })
    expect(update.mock.calls[1][0]).toMatchObject({ nota: 'Nota comparada EUA/UE.', status: 'concluida' })
    fireEvent.click(screen.getByLabelText('Apagar pesquisa Caução'))
    await waitFor(() => expect(del).toHaveBeenCalled())
  })
})
