// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'

const contagem = { count: 3 }
const consulta = () => {
  const q: Record<string, unknown> = { then: (r: (v: { count: number }) => unknown) => Promise.resolve(contagem).then(r) }
  for (const m of ['is', 'gte', 'lte', 'neq', 'lt', 'eq']) q[m] = () => q
  return q
}
const insert = vi.fn(async (_r: unknown) => ({ error: null }))
vi.mock('@/lib/supabase', () => ({
  supabaseConfigurado: true,
  supabase: { from: (t: string) => ({ select: () => t === 'lancamentos_horas' ? Promise.resolve({ data: [{ minutos: 120, faturavel: true }, { minutos: 60, faturavel: false }] }) : consulta(), insert: (r: unknown) => insert(r) }) },
}))
const perguntar = vi.fn(async (texto: string, esp: string, _h: unknown[], _m: string, ctx: string) => ({ id: '1', especialidade: esp, modo: 'responder', pergunta: texto, resposta: `## Prioridades\n1. Reduzir atrasos\n\nContexto: ${ctx}`, criadoEm: '2026-11-02T10:00:00Z', fontes: [] }))
vi.mock('@/lib/assistente', () => ({ perguntar: (...a: unknown[]) => perguntar(...(a as [string, string, unknown[], string, string])) }))
vi.mock('@/components/Layout', () => ({ default: ({ title, children }: { title: string; children: React.ReactNode }) => <div><h1>{title}</h1>{children}</div> }))
vi.mock('@/pages/AssistentePage', () => ({ render: (md: string) => md.replace(/^## (.*)$/m, '<h3>$1</h3>') }))
const { default: ConsultoresPage } = await import('./ConsultoresPage')

describe('Consultores do escritório (um por função)', () => {
  beforeEach(() => { cleanup(); localStorage.clear(); perguntar.mockClear() })

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
    expect(ctx).toContain('3 imóveis na carteira; 3 contratos ativos, 3 vencendo em 60 dias; 3 tarefas abertas, 3 atrasadas; 3 intimações não lidas; 3 horas lançadas, 67% faturáveis')
    expect(resp.querySelector('h3')!.textContent).toBe('Prioridades')
    expect(screen.getByTestId('virar-tarefa').getAttribute('href')).toContain('#/projetos?novo=')
    // D03 (Diamante): as ações extraídas do diagnóstico viram tarefas em 1 clique, com prazo de 7 dias.
    expect(screen.getByTestId('acoes-diagnostico').textContent).toContain('Reduzir atrasos')
    fireEvent.click(screen.getByTestId('virar-tarefas'))
    await waitFor(() => expect(screen.getByTestId('virar-tarefas').textContent).toContain('1 tarefa(s) criada(s)'))
    expect(insert).toHaveBeenCalledWith([expect.objectContaining({ titulo: 'Reduzir atrasos (Sócia-gestora)', nivel: 'tarefa', prioridade: 'media', area: 'Gestão interna', prazo: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/) })])
    fireEvent.click(screen.getByTestId('nova-consulta'))
    expect(screen.queryByTestId('resposta-consultor')).toBeNull()
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
