// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'

const contagem = { count: 3 }
// Casos, intimações e horas de duas pessoas: u1 (quem olha) e u2 (o colega).
const ontem = new Date(Date.now() - 864e5).toISOString().slice(0, 10)
let tarefas: Record<string, unknown>[] = []
let intimacoes: Record<string, unknown>[] = []
let horas: Record<string, unknown>[] = []
const consulta = (t: string) => {
  const q: Record<string, unknown> = { then: (r: (v: unknown) => unknown) => Promise.resolve(
    t === 'tarefas' ? { data: tarefas } : t === 'intimacoes' ? { data: intimacoes } : t === 'lancamentos_horas' ? { data: horas } : contagem).then(r) }
  for (const m of ['is', 'gte', 'lte', 'neq', 'lt', 'eq']) q[m] = () => q
  return q
}
const insert = vi.fn(async (_r: unknown) => ({ error: null }))
vi.mock('@/lib/supabase', () => ({
  supabaseConfigurado: true,
  supabase: { from: (t: string) => ({ select: () => consulta(t), insert: (r: unknown) => insert(r) }) },
}))
// Quem está logado e com que cargo: a privacidade por advogado vale também para os números agregados.
let alcance: { id: string; cargo: string | null; admin: boolean; veTudo: boolean } | null = { id: 'u1', cargo: 'socio', admin: false, veTudo: true }
vi.mock('@/lib/hierarquia', async (original) => ({
  ...(await original<typeof import('@/lib/hierarquia')>()),
  meuAlcance: async () => { if (!alcance) throw new Error('não deu para saber quem está logado'); return alcance },
}))
const perguntar = vi.fn(async (texto: string, esp: string, _h: unknown[], _m: string, ctx: string) => ({ id: '1', especialidade: esp, modo: 'responder', pergunta: texto, resposta: `## Prioridades\n1. Reduzir atrasos\n\nContexto: ${ctx}`, criadoEm: '2026-11-02T10:00:00Z', fontes: [] }))
vi.mock('@/lib/assistente', () => ({ perguntar: (...a: unknown[]) => perguntar(...(a as [string, string, unknown[], string, string])) }))
vi.mock('@/components/Layout', () => ({ default: ({ title, children }: { title: string; children: React.ReactNode }) => <div><h1>{title}</h1>{children}</div> }))
vi.mock('@/pages/AssistentePage', () => ({ render: (md: string) => md.replace(/^## (.*)$/m, '<h3>$1</h3>') }))
const { default: ConsultoresPage } = await import('./ConsultoresPage')

describe('Consultores do escritório (um por função)', () => {
  beforeEach(() => { cleanup(); localStorage.clear(); perguntar.mockClear(); insert.mockClear()
    alcance = { id: 'u1', cargo: 'socio', admin: false, veTudo: true }
    tarefas = [
      { id: 't1', nivel: 'projeto', situacao: 'fazendo', prazo: ontem, responsavel_id: 'u1', numero_processo: '08011112620268190001' },
      { id: 't2', nivel: 'projeto', situacao: 'fazendo', prazo: ontem, responsavel_id: 'u2', numero_processo: '08022223620268190001' },
      { id: 't3', nivel: 'projeto', situacao: 'feito', prazo: ontem, responsavel_id: 'u2', numero_processo: null },
    ]
    intimacoes = [{ numero_processo: '08011112620268190001', lida: false }, { numero_processo: '08022223620268190001', lida: false }]
    horas = [{ minutos: 120, faturavel: true, usuario_id: 'u1' }, { minutos: 60, faturavel: false, usuario_id: 'u2' }]
  })

  it('lista 14 consultores em 4 grupos, começa pela sócia-gestora e lembra o escolhido', () => {
    render(<ConsultoresPage />)
    expect(screen.getAllByTestId(/^consultor-/).length).toBe(14)
    expect(screen.getByRole('navigation', { name: 'Funções' }).textContent).toContain('Sociedade')
    expect(screen.getAllByRole('heading', { level: 2 }).some(h => h.textContent === 'Sócia-gestora')).toBe(true)
    fireEvent.click(screen.getByTestId('consultor-nivel_pmo'))
    expect(screen.getAllByRole('heading', { level: 2 }).some(h => h.textContent === 'Escritório de projetos (PMO)')).toBe(true)
    expect(localStorage.getItem('lsm-consultor')).toBe('nivel_pmo')
    cleanup(); render(<ConsultoresPage />)
    expect(screen.getAllByRole('heading', { level: 2 }).some(h => h.textContent === 'Escritório de projetos (PMO)')).toBe(true)
  })

  it('Diagnóstico agora envia a fotografia agregada do escritório ao consultor e mostra a resposta com ações', async () => {
    render(<ConsultoresPage />)
    fireEvent.click(screen.getByTestId('diagnostico'))
    expect(screen.getByText(/O consultor está analisando/)).toBeTruthy()
    const resp = await screen.findByTestId('resposta-consultor')
    expect(perguntar).toHaveBeenCalledTimes(1)
    const [texto, esp, , modo, ctx] = perguntar.mock.calls[0]
    expect(texto).toContain('do ponto de vista de sócia-gestora')
    expect(esp).toBe('nivel_socio_gestor'); expect(modo).toBe('responder')
    expect(ctx).toContain('Fotografia do escritório')
    expect(ctx).toContain('3 imóveis na carteira; 3 contratos ativos, 3 vencendo em 60 dias; 2 tarefas abertas, 2 atrasadas; 2 intimações não lidas; 3 horas lançadas, 67% faturáveis')
    expect(resp.querySelector('h3')!.textContent).toBe('Prioridades')
    expect(screen.getByTestId('virar-tarefa').getAttribute('href')).toContain('#/projetos?novo=')
    // D03 (Diamante): as ações extraídas do diagnóstico viram tarefas em 1 clique, com prazo de 7 dias.
    expect(screen.getByTestId('acoes-diagnostico').textContent).toContain('Reduzir atrasos')
    fireEvent.click(screen.getByTestId('virar-tarefas'))
    await waitFor(() => expect(screen.getByTestId('virar-tarefas').textContent).toContain('1 tarefa(s) criada(s)'))
    expect(insert).toHaveBeenCalledWith([expect.objectContaining({ titulo: 'Reduzir atrasos (Sócia-gestora)', nivel: 'tarefa', prioridade: 'media', area: 'Gestão interna', responsavel_id: 'u1', prazo: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/) })])
    fireEvent.click(screen.getByTestId('nova-consulta'))
    expect(screen.queryByTestId('resposta-consultor')).toBeNull()
  })

  // Privacidade por advogado: o júnior não leva os números do colega ao consultor; o sócio leva o conjunto.
  it('júnior recebe a fotografia da própria carteira; o sócio, a do escritório', async () => {
    alcance = { id: 'u1', cargo: 'junior', admin: false, veTudo: false }
    render(<ConsultoresPage />)
    await waitFor(() => expect(screen.getByTestId('consultores-alcance').textContent).toContain('os números da sua carteira'))
    fireEvent.click(screen.getByTestId('diagnostico'))
    await screen.findByTestId('resposta-consultor')
    const ctxJunior = perguntar.mock.calls[0][4]
    expect(ctxJunior).toContain('Fotografia da sua carteira')
    // Só o caso de u1, a intimação dele e as horas dele: o caso e a hora do colega ficam de fora.
    expect(ctxJunior).toContain('1 tarefas abertas, 1 atrasadas; 1 intimações não lidas; 2 horas lançadas')

    cleanup(); perguntar.mockClear()
    alcance = { id: 'u1', cargo: 'socio', admin: false, veTudo: true }
    render(<ConsultoresPage />)
    await waitFor(() => expect(screen.queryByTestId('consultores-alcance')).toBeNull())
    fireEvent.click(screen.getByTestId('diagnostico'))
    await screen.findByTestId('resposta-consultor')
    expect(perguntar.mock.calls[0][4]).toContain('2 tarefas abertas, 2 atrasadas; 2 intimações não lidas; 3 horas lançadas')
  })

  // Cargo que não dá para descobrir vale o alcance MAIS ESTREITO, nunca o mais largo.
  it('sem saber quem está logado, a fotografia é a mais estreita possível', async () => {
    alcance = null
    render(<ConsultoresPage />)
    await waitFor(() => expect(screen.getByTestId('consultores-alcance')).toBeTruthy())
    fireEvent.click(screen.getByTestId('diagnostico'))
    await screen.findByTestId('resposta-consultor')
    const ctx = perguntar.mock.calls[0][4]
    expect(ctx).toContain('Fotografia da sua carteira')
    // Nenhum caso com dono, nenhuma intimação de caso com dono, nenhuma hora de ninguém.
    expect(ctx).toContain('0 tarefas abertas, 0 atrasadas; 0 intimações não lidas; 0 horas lançadas')
  })

  it('pergunta específica só com 5+ letras; rascunho lembrado; erro do consultor vira alerta', async () => {
    render(<ConsultoresPage />)
    const campo = screen.getByLabelText('Pergunta ao consultor')
    fireEvent.change(campo, { target: { value: 'oi' } })
    fireEvent.submit(campo.closest('form')!)
    expect(perguntar).not.toHaveBeenCalled()
    fireEvent.change(campo, { target: { value: 'Como reduzir inadimplência?' } })
    expect(localStorage.getItem('lsm-consultor-pergunta')).toBe('Como reduzir inadimplência?')
    perguntar.mockRejectedValueOnce(new Error('Sem chave da IA'))
    fireEvent.submit(campo.closest('form')!)
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('Sem chave da IA'))
    expect(perguntar.mock.calls[0][0]).toBe('Como reduzir inadimplência?')
  })
})
