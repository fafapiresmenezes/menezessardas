// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi, beforeEach } from 'vitest'
import { render, screen, cleanup, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

/**
 * O que estes testes prendem: que a tela da água desenha a série que veio da ANA, que diz em voz
 * alta quando NÃO há coleta (em vez de mostrar gráfico vazio ou número inventado) e que conta os
 * dias sem medição. O que eles NÃO conferem: o conteúdo do SAR da ANA — isso é rede, e mora nos
 * testes da função ana-agua.
 */
const invoke = vi.fn()
vi.mock('@/lib/supabase', () => ({
  supabase: { functions: { invoke: (...a: unknown[]) => invoke(...a) } },
  supabaseConfigurado: true,
}))

vi.mock('@/components/Layout', () => ({ default: ({ title, children }: { title: string; children: React.ReactNode }) => <div><h1>{title}</h1>{children}</div> }))
const AguaPage = (await import('./AguaPage')).default

const serie = [
  { dia: '2026-11-01', valor: 41.2, unidade: '%', observado_em: '2026-11-03T12:00:00-03:00', revisoes: 0, atraso_horas: 60 },
  { dia: '2026-11-02', valor: 40.8, unidade: '%', observado_em: '2026-11-04T12:00:00-03:00', revisoes: 2, atraso_horas: 60 },
]

beforeEach(() => {
  invoke.mockReset()
  invoke.mockImplementation((_f: string, o: { body: Record<string, unknown> }) =>
    o.body.codigo
      ? Promise.resolve({ data: { serie, unidade: '%', pontos: 2 }, error: null })
      : Promise.resolve({ data: { reservatorios: [{ chave_natural: 'ana-sar-17', nome: 'Furnas', atributos: { uf: 'MG' } }] }, error: null }))
})
afterEach(cleanup)

const abrir = () => render(<MemoryRouter><AguaPage /></MemoryRouter>)

describe('tela da água', () => {
  it('mostra o reservatório coletado e desenha a linha da série', async () => {
    abrir()
    await waitFor(() => expect(document.querySelector('svg[role="img"]')).toBeTruthy())
    expect(document.body.textContent).toContain('Furnas')
    const svg = document.querySelector('svg[role="img"]')
    const d = svg!.querySelector('path')!.getAttribute('d')!
    expect(d.startsWith('M')).toBe(true)
    expect(d).toContain('L')
  })

  it('diz de onde vem o número, com endereço da ANA', () => {
    abrir()
    const fonte = screen.getByTitle(/Sistema de Acompanhamento de Reservatórios/)
    expect(fonte.getAttribute('href')).toBe('https://sar.ana.gov.br')
  })

  it('o atraso da informação e as revisões da ANA aparecem na tela', async () => {
    abrir()
    await waitFor(() => expect(document.body.textContent).toContain('60 h'))
    expect(screen.getByTitle(/depois corrigiu/)).toBeTruthy()
  })

  it('conta os dias do período que não têm medição, em vez de fingir linha cheia', async () => {
    abrir()
    await waitFor(() => expect(screen.getByTestId('faltam')).toBeTruthy())
    expect(screen.getByTestId('faltam').textContent).toContain('não inventa')
  })

  it('sem coleta nenhuma, a tela explica onde a coleta roda e não desenha gráfico', async () => {
    invoke.mockImplementation((_f: string, o: { body: Record<string, unknown> }) =>
      o.body.codigo
        ? Promise.resolve({ data: { serie: [], pontos: 0 }, error: null })
        : Promise.resolve({ data: { reservatorios: [{ chave_natural: 'ana-sar-17', nome: 'Furnas', atributos: {} }] }, error: null }))
    abrir()
    await waitFor(() => expect(screen.getByTestId('sem-coleta')).toBeTruthy())
    expect(screen.getByTestId('sem-coleta').textContent).toContain('ana-agua')
    expect(document.querySelector('svg[role="img"]')).toBeNull()
  })

  it('quando o servidor não responde, a tela diz isso e não mostra série antiga', async () => {
    invoke.mockImplementation(() => Promise.resolve({ data: null, error: { message: 'falhou' } }))
    abrir()
    await waitFor(() => expect(screen.getByTestId('erro')).toBeTruthy())
    expect(document.querySelector('svg[role="img"]')).toBeNull()
  })
})
