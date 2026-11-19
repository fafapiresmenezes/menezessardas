// @vitest-environment jsdom
// Abas novas do quadradinho Engenharia (19/11/2026): "Agentes" e "Águas". Nada do que existia foi apagado.
import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AGENTES_ENGENHARIA, FONTES_ATLAS, REGRAS_AGENTES } from '@/data/agentesEngenharia'

vi.mock('@/lib/supabase', () => ({ supabase: { functions: { invoke: vi.fn().mockResolvedValue({ data: null, error: null }) } }, supabaseConfigurado: true }))
vi.mock('@/components/Layout', () => ({ default: ({ title, children }: { title: string; children: React.ReactNode }) => <div><h1>{title}</h1>{children}</div> }))
const EngenhariaPage = (await import('./EngenhariaPage')).default

afterEach(cleanup)

const PROIBIDAS = [/imbono/i, /gemcorp/i, /\busu[aá]rio/i, /\btela\b/i, /\bprojetos?\b/, /\bsetor\b/]

describe('fichas dos agentes de engenharia', () => {
  it('tem 46 fichas, todas com id único, nome, resumo e prompt completo', () => {
    expect(AGENTES_ENGENHARIA).toHaveLength(46)
    expect(new Set(AGENTES_ENGENHARIA.map(a => a.id)).size).toBe(46)
    for (const a of AGENTES_ENGENHARIA) {
      expect(a.nome.length).toBeGreaterThan(3)
      expect(a.resumo.length).toBeGreaterThan(20)
      expect(a.prompt.length).toBeGreaterThan(400)
      expect(a.prompt).toContain('Restrições invioláveis')
    }
    expect(AGENTES_ENGENHARIA.filter(a => a.matriz === 'especialidade')).toHaveLength(14)
    expect(AGENTES_ENGENHARIA.filter(a => a.matriz === 'posicao')).toHaveLength(14)
    expect(AGENTES_ENGENHARIA.filter(a => a.matriz === 'produto')).toHaveLength(14)
    expect(AGENTES_ENGENHARIA.filter(a => a.matriz === 'mestre')).toHaveLength(4)
  })

  it('nunca escreve o nome do cliente nem palavras da plataforma de direito', () => {
    const blob = JSON.stringify({ AGENTES_ENGENHARIA, FONTES_ATLAS, REGRAS_AGENTES })
    for (const re of PROIBIDAS) expect(blob).not.toMatch(re)
  })

  it('toda posição tem nível N1 a N6', () => {
    for (const a of AGENTES_ENGENHARIA.filter(x => x.matriz === 'posicao')) expect(a.nivel).toMatch(/^N[1-6]$/)
  })
})

describe('abas novas do quadradinho Engenharia', () => {
  it('mantém as quatro abas antigas e junta Agentes e Águas', () => {
    render(<MemoryRouter initialEntries={['/engenharia']}><EngenhariaPage /></MemoryRouter>)
    for (const nome of ['Cálculo estrutural', 'Medição de obra', 'Matérias e consultores', 'Estudos para órgãos públicos', 'Agentes', 'Águas']) {
      expect(screen.getByRole('tab', { name: nome })).toBeTruthy()
    }
    expect(screen.getByRole('tab', { name: 'Cálculo estrutural' }).getAttribute('aria-selected')).toBe('true')
  })

  it('abre a aba Agentes pelo endereço e mostra as 14 especialidades, o Atlas e as provas', () => {
    render(<MemoryRouter initialEntries={['/engenharia?aba=agentes']}><EngenhariaPage /></MemoryRouter>)
    expect(screen.getByRole('tab', { name: 'Agentes' }).getAttribute('aria-selected')).toBe('true')
    expect(screen.getAllByTestId('ficha-agente')).toHaveLength(14)
    fireEvent.click(screen.getByTestId('subaba-agentes-posicao'))
    expect(screen.getAllByTestId('ficha-agente')).toHaveLength(14)
    fireEvent.click(screen.getByTestId('subaba-agentes-mestre'))
    expect(screen.getAllByTestId('ficha-agente')).toHaveLength(4)
    fireEvent.click(screen.getAllByRole('button', { name: 'Ver o prompt completo' })[0])
    expect(screen.getByTestId('prompt-agente').textContent).toContain('Restrições invioláveis')
    fireEvent.click(screen.getByTestId('subaba-agentes-atlas'))
    expect(screen.getByTestId('atlas-fontes').textContent).toContain('216')
    fireEvent.click(screen.getByTestId('subaba-agentes-provas'))
    expect(screen.getByTestId('provas-agentes').querySelectorAll('tbody tr')).toHaveLength(46)
  })

  it('a aba Águas monta a casa de Águas inteira sem tirar a página /aguas', () => {
    render(<MemoryRouter initialEntries={['/engenharia?aba=aguas']}><EngenhariaPage /></MemoryRouter>)
    expect(screen.getByTestId('engenharia-aguas')).toBeTruthy()
    expect(screen.getByText('A casa de Águas do Instituto')).toBeTruthy()
    expect(screen.getByTestId('aguas-abrir-reservatorios').getAttribute('href')).toBe('/agua')
  })

  it('clicar numa aba muda o endereço e um endereço inválido cai no cálculo', () => {
    render(<MemoryRouter initialEntries={['/engenharia?aba=nada']}><EngenhariaPage /></MemoryRouter>)
    expect(screen.getByRole('tab', { name: 'Cálculo estrutural' }).getAttribute('aria-selected')).toBe('true')
    fireEvent.click(screen.getByRole('tab', { name: 'Agentes' }))
    expect(screen.getByTestId('agentes-engenharia')).toBeTruthy()
  })
})
