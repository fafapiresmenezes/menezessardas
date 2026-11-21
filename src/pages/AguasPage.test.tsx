// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi, beforeEach } from 'vitest'
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { NORMAS_AGUAS } from '@/data/aguas'
import { ESTUDOS_AGUAS, TESES_AGUAS } from '@/data/aguasBiblioteca'

const invoke = vi.fn()
vi.mock('@/lib/supabase', () => ({ supabase: { functions: { invoke: (...a: unknown[]) => invoke(...a) } }, supabaseConfigurado: true }))
vi.mock('@/components/Layout', () => ({ default: ({ title, children }: { title: string; children: React.ReactNode }) => <div><h1>{title}</h1>{children}</div> }))
const AguasPage = (await import('./AguasPage')).default
const { normalizar } = await import('@/lib/aguasLeitura')

const LEITURA = {
  rios: { estacoes: 1, fonte: 'ANA, telemetria', linhas: [{ estacao: '63001850', uf: 'MS', municipio: 'TRÊS LAGOAS', nome: 'UHE JUPIÁ RIO SUCURIÚ (RIO SUCURIÚ)', dia: '2026-11-17', chuva_mm: '0.3', nivel_cm: '395.79', vazao_m3s: '245.17' }] },
  outorgas: { dia: '2026-11-18', fonte: 'ANA, outorgas', porFinalidade: [{ finalidade: 'Irrigação', n: 9000, volume_m3: '1.5e9' }, { finalidade: 'Abastecimento Público', n: 2000, volume_m3: null }], porUf: [{ uf: 'MG', n: 3000 }] },
  barragens: { dia: '2026-11-18', fonte: 'ANA, SNISB', porClasse: [{ risco: 'Alto', dano: 'Alto', n: 1276 }, { risco: 'Baixo', dano: 'Baixo', n: 2633 }], porUf: [{ uf: 'RS', n: 6630, alto_alto: 2 }] },
}

beforeEach(() => { invoke.mockReset(); invoke.mockResolvedValue({ data: LEITURA, error: null }) })
afterEach(cleanup)

describe('casa de Águas', () => {
  it('leva aos reservatórios e mostra as normas com fonte oficial', () => {
    render(<MemoryRouter><AguasPage /></MemoryRouter>)
    expect(screen.getByTestId('aguas-abrir-reservatorios').getAttribute('href')).toBe('/agua')
    expect(screen.getAllByText('Fonte oficial')).toHaveLength(NORMAS_AGUAS.length)
  })

  it('toda norma tem link https', () => {
    for (const n of NORMAS_AGUAS) expect(n.fonte, n.id).toMatch(/^https:\/\//)
  })

  it('mostra rios, outorgas e barragens medidos, com a data e a fonte de cada bloco', async () => {
    render(<MemoryRouter><AguasPage /></MemoryRouter>)
    await waitFor(() => expect(screen.getByTestId('aguas-rios')).toBeTruthy())
    expect(invoke).toHaveBeenCalledWith('agua-leitura', { body: {} })
    expect(screen.getByText('UHE JUPIÁ RIO SUCURIÚ (RIO SUCURIÚ)')).toBeTruthy()
    expect(screen.getByTestId('aguas-rios').textContent).toContain('245,2')
    expect(screen.getByTestId('aguas-outorgas').textContent).toContain('11.000 autorizações')
    expect(screen.getByTestId('aguas-barragens').textContent).toContain('3.909 barragens')
    expect(screen.getByTestId('aguas-barragens').textContent).toContain('1.276 delas têm risco alto e dano potencial alto')
  })

  it('quando a leitura falha, diz isso em vez de mostrar zero', async () => {
    invoke.mockResolvedValue({ data: null, error: new Error('fora') })
    render(<MemoryRouter><AguasPage /></MemoryRouter>)
    await waitFor(() => expect(screen.getByTestId('aguas-vivo-erro')).toBeTruthy())
    expect(screen.queryByTestId('aguas-outorgas')).toBeNull()
  })

  it('a biblioteca mostra as 10 teses e abre os 50 estudos, todos com link https', () => {
    render(<MemoryRouter><AguasPage /></MemoryRouter>)
    const bib = screen.getByTestId('aguas-biblioteca')
    expect(TESES_AGUAS).toHaveLength(10)
    fireEvent.click(screen.getByTestId('aguas-biblioteca-todos'))
    expect(bib.querySelectorAll('a').length).toBe(ESTUDOS_AGUAS.length + TESES_AGUAS.length)
    for (const x of [...ESTUDOS_AGUAS, ...TESES_AGUAS]) expect(x.link).toMatch(/^https?:\/\//)
  })

  it('número que vem como texto do banco vira número', () => {
    const n = normalizar(LEITURA)
    expect(n.rios.linhas[0].vazao_m3s).toBe(245.17)
    expect(n.outorgas!.porFinalidade[1].volume_m3).toBeNull()
  })
})
