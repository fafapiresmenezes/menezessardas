// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { calcularPrazo } from '@/lib/prazos'

// Consulta encadeada genérica: qualquer método devolve a própria cadeia; `await` entrega o resultado da tabela.
type Res = { data?: unknown; count?: number; error?: unknown }
const resultados: Record<string, Res> = {}
const upsert = vi.fn(async (_r: unknown, _o?: unknown) => ({}))
const update = vi.fn(async (_r: unknown) => ({ error: null }))
const cadeia = (t: string, op = 'select') => {
  const o: Record<string, unknown> = {}
  for (const m of ['select', 'order', 'limit', 'eq', 'neq', 'lte', 'gte', 'is', 'maybeSingle']) o[m] = () => o
  o.then = (r: (v: Res) => unknown) => Promise.resolve(resultados[op === 'update' ? `${t}:update` : t] ?? { data: null }).then(r)
  return o
}
const invoke = vi.fn(async (_f: string, _o?: object): Promise<{ data: unknown; error: unknown }> => ({ data: { enviado: true }, error: null }))
const rpc = vi.fn(async (f: string, _p?: object) => (f === 'progresso_horas' ? { data: resultados.horas?.data ?? null } : { data: null }))
vi.mock('@/lib/supabase', () => ({
  supabaseConfigurado: true,
  supabase: {
    from: (t: string) => ({ ...cadeia(t), upsert: (r: unknown, o?: unknown) => upsert(r, o), update: (r: unknown) => ({ eq: async () => { return update(r) } }) }),
    rpc: (f: string, p?: object) => rpc(f, p),
    auth: { getUser: async () => ({ data: { user: { id: 'u1' } } }) },
    functions: { invoke: (f: string, o?: object) => invoke(f, o) },
  },
}))
vi.mock('@/pages/AssistentePage', () => ({ render: (md: string) => <div data-testid="diagnostico-md">{md}</div> }))
vi.mock('@/components/Layout', () => ({ default: ({ title, children }: { title: string; children: React.ReactNode }) => <div><h1>{title}</h1>{children}</div> }))
const { default: MeuDiaPage } = await import('./MeuDiaPage')

const hoje = new Date(); const iso = (d: number) => new Date(hoje.getTime() + d * 86400000).toISOString().slice(0, 10)
const semana = { semana: '2026-11-02', socia: { contratos_vencidos: 2, valor_60_dias: 1234.5 }, advogada: { intimacoes_nao_lidas: 3, prazos_vencidos: 0 }, secretaria: { compromissos_semana: 4 } }
describe('Meu dia', () => {
  beforeEach(() => { cleanup(); localStorage.clear(); upsert.mockClear(); update.mockClear(); invoke.mockClear(); rpc.mockClear(); for (const k of Object.keys(resultados)) delete resultados[k]
    resultados.tarefas = { data: [{ id: 't1', titulo: 'Protocolar defesa', prazo: iso(-1), prioridade: 'alta' }, { id: 't2', titulo: 'Ligar para cliente', prazo: iso(2), prioridade: 'media' }] }
    resultados.intimacoes = { count: 5 }
    resultados.contratos = { data: [{ id: 'c1', imovel_id: 'i1', locatario_fornecedor: 'Loja Centro', data_vencimento: iso(30) }] }
    resultados.resumos_semanais = { data: { conteudo: semana, criado_em: '2026-11-02T08:00:00Z', enviado_em: '2026-11-02T08:01:00Z', destinatarios: 6 } }
    resultados.diagnosticos_semanais = { data: { id: 'd1', resposta: '## Diagnóstico\n\n### Ações\n1. Revisar os contratos vencidos\n2. Cobrar honorários atrasados', criado_em: '2026-11-02T06:00:00Z' } }
    resultados.acoes_consultor = { data: [{ id: 'a1', indice: 1, texto: 'Revisar os contratos vencidos', feito_em: null }, { id: 'a2', indice: 2, texto: 'Cobrar honorários atrasados', feito_em: '2026-11-02T09:00:00Z' }] }
    resultados.horas = { data: { meta: 120, horas: 20, esperado_hoje: 60, pct_ritmo: 33, abaixo: true } }
    resultados.monitoramentos = { data: [{ id: 'm1', valor: '08012345620268190001', rotulo: 'Despejo Rua A', novidade_em: '2026-11-06T10:00:00Z', novidades: [{ data: '2026-11-05', texto: 'Sentença publicada' }, { data: '2026-11-04', texto: 'Juntada' }] }, { id: 'm2', valor: '1', rotulo: null, novidade_em: null, novidades: [] }] }
  })

  it('papel lembrado muda foco, atalhos e seção do resumo; tarefas, intimações e contratos vencendo; aviso de horas abaixo do ritmo', async () => {
    render(<MemoryRouter><MeuDiaPage /></MemoryRouter>)
    expect(screen.getByRole('radio', { name: 'Advogada' }).getAttribute('aria-checked')).toBe('true')
    expect(screen.getByText('Prazos, intimações e peças do dia.')).toBeTruthy()
    await waitFor(() => expect(screen.getByTestId('intimacoes-nao-lidas').textContent).toBe('5'))
    expect(screen.getByText('Protocolar defesa', { exact: false })).toBeTruthy()
    expect(screen.getByText(/Loja Centro/).getAttribute('href')).toBe('/contrato/i1')
    await waitFor(() => expect(screen.getByTestId('resumo-intimacoes_nao_lidas').textContent).toBe('Intimações não lidas3'))
    expect(screen.getByText(/enviado a 6 pessoa\(s\)/)).toBeTruthy()
    await waitFor(() => expect(screen.getByTestId('horas-abaixo')).toBeTruthy())
    expect(screen.getByTestId('alerta-horas').getAttribute('role')).toBe('alert')
    fireEvent.click(screen.getByTestId('papel-socia'))
    expect(localStorage.getItem('lsm-papel')).toBe('socia')
    expect(screen.getByText('Indicadores e OKRs').getAttribute('href')).toBe('/indicadores')
    await waitFor(() => expect(screen.getByTestId('resumo-valor_60_dias').textContent!.replace(/ /g, ' ')).toBe('Valor mensal em risco (60 dias)R$ 1.234,50'))
    await waitFor(() => expect(rpc).toHaveBeenCalledWith('definir_papel', { p_papel: 'socia' }))
  })

  it('consultor da semana: diagnóstico do nível, ações garantidas no banco e marcáveis com aderência; resumo de teste por e-mail', async () => {
    render(<MemoryRouter><MeuDiaPage /></MemoryRouter>)
    await waitFor(() => expect(screen.getByTestId('diagnostico-md').textContent).toContain('Revisar os contratos vencidos'))
    await waitFor(() => expect(screen.getByTestId('aderencia-semana').textContent).toBe('1 de 2 feitas (50%)'))
    expect(upsert).toHaveBeenCalledWith([{ diagnostico_id: 'd1', indice: 1, texto: 'Revisar os contratos vencidos' }, { diagnostico_id: 'd1', indice: 2, texto: 'Cobrar honorários atrasados' }], { onConflict: 'diagnostico_id,indice', ignoreDuplicates: true })
    fireEvent.click(screen.getByTestId('acao-1'))
    await waitFor(() => expect(screen.getByTestId('aderencia-semana').textContent).toBe('2 de 2 feitas (100%)'))
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ usuario_id: 'u1' }))
    fireEvent.click(screen.getByTestId('acao-2'))
    await waitFor(() => expect(screen.getByTestId('aderencia-semana').textContent).toBe('1 de 2 feitas (50%)'))
    // O botão de resumo de teste saiu da tela (pedido do M, 12/11/2026): cliente não testa.
    expect(screen.queryByTestId('testar-resumo')).toBeNull()
  })

  it('calculadora de prazo em dias úteis (em dobro lembrado) com feriados do Rio; copiar meu dia e baixar CSV', async () => {
    const write = vi.fn(async (_t: string) => undefined); Object.assign(navigator, { clipboard: { writeText: write } })
    URL.createObjectURL = vi.fn(() => 'blob:x'); URL.revokeObjectURL = vi.fn()
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined)
    render(<MemoryRouter><MeuDiaPage /></MemoryRouter>)
    await waitFor(() => expect(screen.getByTestId('intimacoes-nao-lidas').textContent).toBe('5'))
    fireEvent.change(screen.getByTestId('prazo-inicio'), { target: { value: '2026-11-13' } }) // sexta
    fireEvent.change(screen.getByTestId('prazo-dias'), { target: { value: '5' } })
    // publicação na sexta 13/11: o início (segunda 16/11) não conta; 5 dias úteis → segunda 23/11 (CPC arts. 224 e 231).
    expect(screen.getByTestId('prazo-final').textContent).toBe('23/11/2026')
    fireEvent.click(screen.getByLabelText(/Em dobro/))
    const dobro = new Date(`${calcularPrazo('2026-11-13', 5, true).final}T12:00`).toLocaleDateString('pt-BR')
    expect(dobro).not.toBe('23/11/2026')
    expect(screen.getByTestId('prazo-final').textContent).toBe(dobro)
    expect(JSON.parse(localStorage.getItem('lsm-meudia-calc')!)).toEqual({ dias: 5, dobro: true })
    expect(within(screen.getByTestId('feriados-rio')).getAllByTestId('feriado-rio').some(li => li.textContent!.includes('20/01/2026 · São Sebastião'))).toBe(true)
    fireEvent.click(screen.getByTestId('copiar-dia'))
    expect(screen.getByTestId('copiar-dia').textContent).toBe('Dia copiado')
    const t = write.mock.calls[0][0]
    expect(t).toContain('· Advogada'); expect(t).toContain('Tarefas (7 dias): 2'); expect(t).toContain('Intimações não lidas: 5'); expect(t).toContain('· Loja Centro')
    fireEvent.click(screen.getByTestId('baixar-meu-dia'))
    expect(click).toHaveBeenCalled()
    expect(screen.getByTestId('baixar-meu-dia').textContent).toBe('baixado')
    click.mockRestore()
  })

  it('D15: movimentações novas dos processos monitorados aparecem em Meu dia com link ao Monitoramento', async () => {
    render(<MemoryRouter><MeuDiaPage /></MemoryRouter>)
    const bloco = await screen.findByTestId('movimentacoes')
    await waitFor(() => expect(within(bloco).getAllByTestId('movimentacao')).toHaveLength(1))
    expect(within(bloco).getByTestId('movimentacao').textContent).toBe('Despejo Rua A: Sentença publicada (+1)')
  })
})
