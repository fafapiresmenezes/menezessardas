// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render as renderBase, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { ReactElement } from 'react'

let rota = '/monitoramento'
const render = (el: ReactElement) => renderBase(<MemoryRouter initialEntries={[rota]}>{el}</MemoryRouter>)

let lista: object[] = []
const invoke = vi.fn(async (_n: string, o: { body: Record<string, unknown> }): Promise<{ data?: unknown; error: { message: string } | null }> => {
  if (o.body.sincronizar) return { data: { sincronizados: 2 }, error: null }
  if (o.body.linha_do_tempo) return { data: { numero: o.body.linha_do_tempo, tribunal: 'TJRJ', encontrado: true, classe: 'Despejo', orgao: '10ª Vara Cível', movs: [{ data: '2026-10-05', nome: 'Citação expedida' }, { data: '2026-09-01', nome: 'Distribuído' }, { data: '2020-01-01', nome: 'Andamento antigo' }] }, error: null }
  return { data: { verificados: 1, resumo: [{ valor: 'x', novas: 2 }] }, error: null }
})
const insert = vi.fn(async (_r: object): Promise<{ data: { id: string } | null; error: { code?: string } | null }> => ({ data: { id: 'm9' }, error: null }))
const del = vi.fn(async () => ({}))
const update = vi.fn(async (_r: object) => ({}))
let casos: object[] = []
vi.mock('@/lib/supabase', () => ({
  supabaseConfigurado: true,
  supabase: {
    from: (t: string) => ({ select: () => ({ order: async () => ({ data: t === 'tarefas' ? casos : lista }) }), insert: (r: object) => ({ select: () => ({ single: () => insert(r) }) }), delete: () => ({ eq: async () => { await del(); return {} } }), update: (r: object) => ({ eq: async () => { await update(r); return {} } }) }),
    functions: { invoke: (n: string, o: { body: Record<string, unknown> }) => invoke(n, o) },
  },
}))
// Quem está olhando: processo monitorado segue o dono do caso; nome monitorado, quem o cadastrou.
let alcance: { id: string; cargo: string | null; admin: boolean; veTudo: boolean } | null = { id: 'u1', cargo: 'socio', admin: false, veTudo: true }
vi.mock('@/lib/hierarquia', async (original) => ({
  ...(await original<typeof import('@/lib/hierarquia')>()),
  meuAlcance: async () => { if (!alcance) throw new Error('não deu para saber quem está logado'); return alcance },
}))
vi.mock('@/components/Layout', () => ({ default: ({ title, children }: { title: string; children: React.ReactNode }) => <div><h1>{title}</h1>{children}</div> }))
const { default: MonitoramentoPage } = await import('./MonitoramentoPage')
const NUM = '0801234-56.2026.8.19.0001'

// Apagar agora pede confirmação: nos testes, a pessoa sempre confirma.
beforeEach(() => { vi.spyOn(window, 'confirm').mockReturnValue(true) })

describe('Monitoramento de processos e nomes (CNJ)', () => {
  beforeEach(() => { cleanup(); lista = []; casos = []; invoke.mockClear(); insert.mockClear(); del.mockClear(); localStorage.clear(); window.scrollTo = vi.fn()
    alcance = { id: 'u1', cargo: 'socio', admin: false, veTudo: true } })

  // Privacidade por advogado: o processo do colega não aparece no monitoramento de quem não cuida dele.
  const comDoisAdvogados = () => {
    casos = [
      { numero_processo: '0801111-26.2026.8.19.0001', responsavel_id: 'u1' },
      { numero_processo: '0802222-36.2026.8.19.0001', responsavel_id: 'u2' },
    ]
    lista = [
      { id: 'm1', tipo: 'processo', valor: '08011112620268190001', rotulo: 'MEU CASO', ultimo_estado: null, novidades: [], verificado_em: null, novidade_em: null, criado_por: 'u1' },
      { id: 'm2', tipo: 'processo', valor: '08022223620268190001', rotulo: 'CASO DO COLEGA', ultimo_estado: null, novidades: [], verificado_em: null, novidade_em: null, criado_por: 'u2' },
      { id: 'm3', tipo: 'nome', valor: 'NOME DO COLEGA', rotulo: null, ultimo_estado: null, novidades: [], verificado_em: null, novidade_em: null, criado_por: 'u2' },
    ]
  }

  it('júnior não vê o processo monitorado do colega; o sócio vê todos', async () => {
    comDoisAdvogados(); alcance = { id: 'u1', cargo: 'junior', admin: false, veTudo: false }
    render(<MonitoramentoPage />)
    await waitFor(() => expect(screen.getByTestId('monitoramento-alcance').textContent).toContain('o monitoramento dos seus casos'))
    await waitFor(() => expect(screen.getAllByTestId('mon-item').length).toBe(1))
    expect(screen.getAllByTestId('mon-item')[0].textContent).toContain('MEU CASO')

    cleanup(); alcance = { id: 'u1', cargo: 'socio', admin: false, veTudo: true }
    render(<MonitoramentoPage />)
    await waitFor(() => expect(screen.getAllByTestId('mon-item').length).toBe(3))
    expect(screen.queryByTestId('monitoramento-alcance')).toBeNull()
  })

  it('sem saber quem está logado, esconde o monitoramento com dono em vez de mostrar tudo', async () => {
    comDoisAdvogados(); alcance = null
    render(<MonitoramentoPage />)
    await waitFor(() => expect(screen.getByTestId('monitoramento-alcance')).toBeTruthy())
    expect(screen.queryAllByTestId('mon-item').length).toBe(0)
  })

  it('exige 20 dígitos para processo e 4 letras para nome; adiciona, verifica na hora e lista com novidades', async () => {
    render(<MonitoramentoPage />)
    fireEvent.change(screen.getByTestId('mon-valor'), { target: { value: '123' } })
    fireEvent.click(screen.getByTestId('mon-adicionar'))
    expect(screen.getByTestId('mon-msg').textContent).toContain('20 dígitos')
    fireEvent.click(screen.getByRole('radio', { name: 'Nome de parte' }))
    fireEvent.change(screen.getByTestId('mon-valor'), { target: { value: 'ana' } })
    fireEvent.click(screen.getByTestId('mon-adicionar'))
    expect(screen.getByTestId('mon-msg').textContent).toBe('Digite pelo menos 4 letras.')
    fireEvent.change(screen.getByTestId('mon-valor'), { target: { value: 'Ana Souza' } })
    fireEvent.change(screen.getByLabelText('Apelido'), { target: { value: 'cliente' } })
    lista = [{ id: 'm9', tipo: 'nome', valor: 'ANA SOUZA', rotulo: 'cliente', ultimo_estado: null, novidades: [{ data: '2026-11-01', texto: 'Intimação publicada', vista_em: '' }], verificado_em: '2026-11-02T10:00:00Z', novidade_em: '2026-11-01' }]
    fireEvent.click(screen.getByTestId('mon-adicionar'))
    await waitFor(() => expect(insert).toHaveBeenCalledWith({ tipo: 'nome', valor: 'ANA SOUZA', rotulo: 'cliente' }))
    await waitFor(() => expect(invoke).toHaveBeenCalledWith('monitorar', expect.objectContaining({ body: { id: 'm9' } })))
    await waitFor(() => expect(screen.getByTestId('mon-msg').textContent).toBe('1 verificado(s), 2 novidade(s).'))
    const item = await screen.findByTestId('mon-item')
    expect(item.textContent).toContain('cliente · ANA SOUZA')
    expect(item.textContent).toContain('Diário de Justiça Eletrônico Nacional')
    expect(item.textContent).toContain('Intimação publicada')
    fireEvent.click(screen.getByLabelText('Parar de monitorar'))
    await waitFor(() => expect(del).toHaveBeenCalled())
    insert.mockResolvedValueOnce({ data: null, error: { code: '23505' } })
    fireEvent.change(screen.getByTestId('mon-valor'), { target: { value: 'Outro Nome' } })
    fireEvent.click(screen.getByTestId('mon-adicionar'))
    await waitFor(() => expect(screen.getByTestId('mon-msg').textContent).toBe('Isso já está sendo monitorado.'))
  })

  it('linha do tempo: consulta o DataJud, filtra por período e texto, copia o resultado', async () => {
    const writeText = vi.fn(async (_t: string) => undefined)
    Object.assign(navigator, { clipboard: { writeText } })
    render(<MonitoramentoPage />)
    fireEvent.change(screen.getByTestId('lt-numero'), { target: { value: '123' } })
    fireEvent.click(screen.getByTestId('lt-consultar'))
    expect(screen.getByTestId('lt-msg').textContent).toContain('20 dígitos')
    fireEvent.change(screen.getByTestId('lt-numero'), { target: { value: NUM } })
    fireEvent.change(screen.getByTestId('lt-de'), { target: { value: '2026-01-01' } })
    fireEvent.change(screen.getByTestId('lt-ate'), { target: { value: '2026-12-31' } })
    fireEvent.click(screen.getByTestId('lt-consultar'))
    await waitFor(() => expect(screen.getByTestId('lt-total').textContent).toBe('2'))
    expect(invoke.mock.calls[0][1].body).toEqual({ linha_do_tempo: '08012345620268190001' })
    expect(screen.getAllByTestId('lt-mov').length).toBe(2)
    expect(screen.getByText(/Despejo · 10ª Vara Cível · 3 andamentos no total/)).toBeTruthy()
    fireEvent.change(screen.getByTestId('lt-busca'), { target: { value: 'citação' } })
    expect(screen.getAllByTestId('lt-mov').length).toBe(1)
    fireEvent.click(screen.getByTestId('lt-copiar'))
    await waitFor(() => expect(screen.getByTestId('lt-copiar').textContent).toBe('Linha do tempo copiada'))
    expect(writeText.mock.calls[0][0]).toContain('1 andamento(s) de 01/01/2026 a 31/12/2026 com "citação"')
    expect(writeText.mock.calls[0][0]).toContain('05/10/2026 — Citação expedida')
    fireEvent.change(screen.getByTestId('lt-busca'), { target: { value: 'zzz' } })
    expect(screen.getByText('Nenhum andamento no período')).toBeTruthy()
  })

  it('abrir /monitoramento?lt=<número> (link da Carteira) consulta a linha do tempo sozinho', async () => {
    rota = `/monitoramento?lt=${NUM}`
    render(<MonitoramentoPage />)
    await waitFor(() => expect(screen.getByTestId('lt-total')).toBeTruthy())
    expect(invoke.mock.calls[0][1].body).toEqual({ linha_do_tempo: '08012345620268190001' })
    rota = '/monitoramento'
  })

  it('erro das fontes do CNJ ao verificar tudo vira aviso', async () => {
    lista = [{ id: 'm1', tipo: 'processo', valor: '08012345620268190001', rotulo: null, ultimo_estado: { classe: 'Despejo', orgao: '1ª Vara' }, novidades: [], verificado_em: null, novidade_em: null }]
    invoke.mockResolvedValueOnce({ data: null, error: { message: 'timeout' } })
    render(<MonitoramentoPage />)
    const item = await screen.findByTestId('mon-item')
    expect(item.textContent).toContain('Despejo · 1ª Vara · verificado ainda não')
    expect(item.textContent).toContain('Sem novidades desde que começou')
    fireEvent.click(screen.getByText('Verificar tudo agora'))
    await waitFor(() => expect(screen.getByTestId('mon-msg').textContent).toContain('As fontes do CNJ não responderam agora'))
  })

  it('D15: trazer processos dos casos chama a sincronização; marcar novidades como vistas limpa a lista', async () => {
    lista = [{ id: 'm1', tipo: 'processo', valor: '08012345620268190001', rotulo: 'Despejo Rua A', ultimo_estado: { classe: 'Despejo' }, novidades: [{ data: '2026-11-05', texto: 'Sentença', vista_em: '2026-11-06' }], verificado_em: '2026-11-06', novidade_em: '2026-11-06' }]
    render(<MonitoramentoPage />)
    await screen.findByTestId('mon-item')
    fireEvent.click(screen.getByTestId('mon-trazer-casos'))
    await waitFor(() => expect(invoke).toHaveBeenCalledWith('monitorar', expect.objectContaining({ body: { sincronizar: true } })))
    expect(screen.getByTestId('mon-msg').textContent).toContain('2 processo(s) dos casos entraram')
    fireEvent.click(screen.getByTestId('mon-vistas'))
    await waitFor(() => expect(update).toHaveBeenCalledWith({ novidades: [], novidade_em: null }))
  })
})
