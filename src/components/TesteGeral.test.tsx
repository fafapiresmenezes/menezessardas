// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'

// Revisão 06/11: relógio fixo ao meio-dia (UTC); antes o teste falhava entre 0h e 9h UTC.
vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date('2026-11-02T12:00:00Z'))
const hoje = new Date().toISOString().slice(0, 10)
const ontem = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
let diario: object[] = []
let historico: object[] = []
const invoke = vi.fn(async (nome: string, _o?: object) => {
  if (nome.startsWith('consultar-cnpj')) return { data: { empresa: { nome: 'Banco do Brasil', situacao: 'ATIVA' } }, error: null }
  if (nome === 'assistente-juridico') return { data: { artigos: 90 }, error: null }
  if (nome === 'indice-reajuste') return { data: { acumulado12m: 3.2 }, error: null }
  if (nome === 'jurimetria') return { data: { chanceExito: 71, amostra: 1200 }, error: null }
  if (nome === 'analisar-contrato') return { data: { erro: 'chave da IA ausente' }, error: null }
  return { data: {}, error: null }
})
vi.mock('@/lib/supabase', () => ({
  supabaseConfigurado: true,
  supabase: {
    functions: { invoke: (n: string, o?: object) => invoke(n, o as never) },
    from: (t: string) => ({
      select: (_c: string, opts?: { count?: string; head?: boolean }) => opts?.head
        ? Promise.resolve({ count: 42, error: null })
        : ({ order: () => ({ limit: async () => ({ data: diario }) }), gte: () => ({ order: () => ({ limit: async () => ({ data: t === 'saude_sistema' ? historico : [] }) }) }) }),
    }),
  },
}))
vi.mock('@/lib/repositorio', () => ({ repositorio: { listarImoveis: async () => [{ id: 'i1' }, { id: 'i2' }], listarContratos: async () => [{ id: 'c1' }] } }))
vi.mock('@/lib/legislacao', () => ({ radarPortais: async () => [{}, {}, {}] }))
vi.mock('@/lib/predicao', () => ({ preverCarteira: () => [{}] }))
const { default: TesteGeral } = await import('./TesteGeral')

describe('Testar todas as funções (painel do administrador)', () => {
  beforeEach(() => { cleanup(); diario = []; historico = []; invoke.mockClear() })

  it('mostra o último teste automático com as falhas e o histórico de 30 dias com tendência', async () => {
    diario = [
      { verificacao: 'Site no ar', ok: true, verificado_em: `${hoje}T09:00:00Z`, detalhe: null },
      { verificacao: 'Chave da IA', ok: false, verificado_em: `${hoje}T08:45:00Z`, detalhe: 'sem chave' },
      { verificacao: 'Site no ar', ok: true, verificado_em: `${hoje}T08:00:00Z`, detalhe: null },
    ]
    historico = [
      { verificacao: 'Site no ar', ok: true, verificado_em: `${ontem}T09:00:00Z` },
      { verificacao: 'Site no ar', ok: false, verificado_em: `${hoje}T07:00:00Z` },
      { verificacao: 'Site no ar', ok: true, verificado_em: `${hoje}T09:00:00Z` },
      { verificacao: 'Chave da IA', ok: true, verificado_em: `${hoje}T08:45:00Z` },
    ]
    render(<TesteGeral />)
    await waitFor(() => expect(screen.getByText(/Último teste automático/).textContent).toContain('1 de 2 funcionando'))
    expect(screen.getByText(/Com falha:/).textContent).toContain('Chave da IA')
    const hist = await screen.findByTestId('historico-30-dias')
    expect(screen.getAllByTestId('linha-historico').length).toBe(2)
    expect(screen.getByTestId('tendencia-testes').textContent).toContain('75%')
    const resumo = screen.getByTestId('linha-resumo')
    expect(resumo.textContent).toContain('1/2')
    expect(hist.querySelectorAll('td.bg-critico').length).toBe(1)
    expect(hist.querySelectorAll('td.bg-regular').length).toBe(2)
    const writeText = vi.fn(async (_t: string) => undefined)
    Object.assign(navigator, { clipboard: { writeText } })
    fireEvent.click(screen.getByTestId('copiar-historico-testes'))
    await waitFor(() => expect(writeText).toHaveBeenCalled())
    expect(writeText.mock.calls[0][0]).toContain('últimos 30 dias')
    expect(writeText.mock.calls[0][0]).toContain(`${hoje.split('-').reverse().join('/')}: 1/2`)
  })

  it('Testar tudo roda as 9 funções, mostra 8 de 9 com a falha da chave da IA e copia o relatório', async () => {
    const writeText = vi.fn(async (_t: string) => undefined)
    Object.assign(navigator, { clipboard: { writeText } })
    render(<TesteGeral />)
    fireEvent.click(screen.getByText('Testar tudo'))
    await waitFor(() => expect(screen.getByText(/de 9 funcionando/).textContent).toBe('8 de 9 funcionando'))
    expect(screen.getByText((_, el) => el?.tagName === 'SPAN' && (el.textContent ?? '').startsWith('2 imóveis, 1 contratos'))).toBeTruthy()
    expect(screen.getByText((_, el) => el?.tagName === 'SPAN' && (el.textContent ?? '').startsWith('chave da IA ausente'))).toBeTruthy()
    expect(screen.getByText((_, el) => el?.tagName === 'SPAN' && (el.textContent ?? '').startsWith('Banco do Brasil: ATIVA'))).toBeTruthy()
    expect(screen.getByText((_, el) => el?.tagName === 'SPAN' && (el.textContent ?? '').startsWith('42 previsões guardadas'))).toBeTruthy()
    expect(screen.getAllByLabelText('Funcionando').length).toBe(8)
    expect(screen.getAllByLabelText('Falhou').length).toBe(1)
    fireEvent.click(screen.getByTestId('copiar-relatorio'))
    await waitFor(() => expect(screen.getByTestId('copiar-relatorio').textContent).toBe('Relatório copiado'))
    const rel = writeText.mock.calls[0][0]
    expect(rel).toContain('8 de 9 funções funcionando')
    expect(rel).toContain('FALHOU · Chave da IA (análise de contrato) · chave da IA ausente')
  })
})
