// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'

const area = (a: string, nome: string, variacao: number, confianca = 'alta', extra: object = {}) => ({
  area: a, nome, porAno: [{ ano: 2023, n: 1000 }, { ano: 2024, n: 1100 }, { ano: 2025, n: 1200 }], amostra: 3300, fonte: 'DataJud', consultadoEm: '2026-11-01',
  previsao: { ano: 2028, processos: 1500, margem: 100, variacao, r2: 0.9 }, confianca, ...extra,
})
const invoke = vi.fn(async (_n: string, o: { body: { area: string } }) => {
  const a = o.body.area
  if (a === 'imobiliario') return { data: area(a, 'Imobiliário', 25, 'alta', { jen: { fonte: 'JEN', tribunal: 'TJRJ', indicador: 'casos novos', porAno: [{ ano: 2025, n: 900 }], previsao: { ano: 2028, processos: 1000, margem: 50, variacao: 10, r2: 0.8 }, confianca: 'media', concordam: true } }), error: null }
  if (a === 'civel') return { data: area(a, 'Cível', -5, 'media'), error: null }
  if (a === 'penal') return { data: area(a, 'Penal', 40, 'baixa'), error: null }
  if (a === 'familia') return { data: { erro: 'O CNJ não respondeu.' }, error: null }
  return { data: null, error: { message: 'falhou' } }
})
vi.mock('@/lib/supabase', () => ({ supabaseConfigurado: true, supabase: { functions: { invoke: (n: string, o: { body: { area: string } }) => invoke(n, o) } } }))
vi.mock('@/components/Layout', () => ({ default: ({ title, children }: { title: string; children: React.ReactNode }) => <div><h1>{title}</h1>{children}</div> }))
vi.mock('@/components/ComparacaoJustica', () => ({ default: () => <div data-testid="comparacao" /> }))
const { default: MercadoPage } = await import('./MercadoPage')

describe('Previsão de mercado jurídico (demanda por área)', () => {
  beforeEach(() => { cleanup(); invoke.mockClear() })

  it('consulta as 10 áreas, mostra cada cartão com previsão, duas fontes, erro do CNJ, e o ranking só com confiança alta ou média', async () => {
    render(<MercadoPage />)
    expect(screen.getAllByText('Consultando o CNJ…').length).toBe(10)
    const ranking = await screen.findByTestId('ranking')
    expect(invoke).toHaveBeenCalledTimes(10)
    expect(ranking.querySelectorAll('li').length).toBe(2)
    expect(ranking.textContent).toContain('Imobiliário: +25% até 2028')
    expect(ranking.textContent).toContain('duas fontes concordam')
    expect(ranking.textContent).toContain('Cível: -5% até 2028')
    expect(screen.getByText(/Leitura rápida/).closest('p')!.textContent).toContain('a área que mais cresce é Imobiliário, e a que menos cresce é Cível')
    expect(screen.getByTestId('mercado-penal').textContent).toContain('Sem tendência confiável')
    expect(screen.getByTestId('jen-imobiliario').textContent).toContain('As duas fontes apontam a mesma direção.')
    expect(screen.getByText('Família: O CNJ não respondeu.')).toBeTruthy()
    expect(screen.getByText('Trabalhista: O CNJ não respondeu agora. Tente de novo em alguns minutos.')).toBeTruthy()
    expect(screen.getByTestId('comparacao')).toBeTruthy()
  })

  it('copia o ranking e todas as áreas para a reunião de sócios', async () => {
    const writeText = vi.fn(async (_t: string) => undefined)
    Object.assign(navigator, { clipboard: { writeText } })
    render(<MercadoPage />)
    await screen.findByTestId('ranking')
    fireEvent.click(screen.getByTestId('copiar-ranking'))
    await waitFor(() => expect(screen.getByTestId('copiar-ranking').textContent).toBe('ranking copiado'))
    expect(writeText.mock.calls[0][0]).toContain('1. Imobiliário: +25% até 2028 (confiança alta)')
    expect(writeText.mock.calls[0][0]).toContain('2. Cível: -5% até 2028 (confiança media)')
    fireEvent.click(screen.getByTestId('copiar-areas'))
    await waitFor(() => expect(screen.getByTestId('copiar-areas').textContent).toBe('Áreas copiadas'))
    expect(writeText.mock.calls[1][0]).toContain('Penal: +40% até 2028 · confiança baixa · amostra 3.300 · DataJud')
  })
})
