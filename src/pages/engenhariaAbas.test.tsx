// @vitest-environment jsdom
// Abas novas do quadradinho Engenharia (19/11/2026): "Agentes" e "Águas". Nada do que existia foi apagado.
import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AGENTES_ENGENHARIA, ATLAS_RESUMO, CLASSIFICACAO_ATLAS, FONTES_ATLAS, REGRAS_AGENTES, RESULTADO_PROVAS } from '@/data/agentesEngenharia'

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
    const blob = JSON.stringify({ AGENTES_ENGENHARIA, ATLAS_RESUMO, CLASSIFICACAO_ATLAS, FONTES_ATLAS, REGRAS_AGENTES, RESULTADO_PROVAS })
    for (const re of PROIBIDAS) expect(blob).not.toMatch(re)
  })

  it('os números do Atlas são coerentes e medidos', () => {
    expect(ATLAS_RESUMO.medidoEm).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(ATLAS_RESUMO.total).toBe(ATLAS_RESUMO.externos + ATLAS_RESUMO.internos)
    expect(ATLAS_RESUMO.guardaveis + ATLAS_RESUMO.soReferencia).toBe(ATLAS_RESUMO.externos)
    expect(ATLAS_RESUMO.programasVerificados).toBeLessThanOrEqual(ATLAS_RESUMO.programasMapeados)
    expect(ATLAS_RESUMO.porEspecialidade).toHaveLength(14)
    for (const e of ATLAS_RESUMO.porEspecialidade) {
      expect(e.guardaveis).toBeLessThanOrEqual(e.itens)
      expect(e.universidades).toBeLessThanOrEqual(ATLAS_RESUMO.universidades)
    }
  })

  it('a classificação do corpus bate com o corpus e aponta para agentes que existem', () => {
    expect(CLASSIFICACAO_ATLAS.medidoEm).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(CLASSIFICACAO_ATLAS.classificados).toBe(ATLAS_RESUMO.externos)
    expect(CLASSIFICACAO_ATLAS.comContextoAfricano).toBeLessThanOrEqual(CLASSIFICACAO_ATLAS.classificados)
    expect(CLASSIFICACAO_ATLAS.tipos.reduce((s, t) => s + t.n, 0)).toBe(CLASSIFICACAO_ATLAS.classificados)
    expect(CLASSIFICACAO_ATLAS.estantes.length).toBeGreaterThanOrEqual(14)
    const ids = new Set(AGENTES_ENGENHARIA.map(a => a.id))
    for (const e of CLASSIFICACAO_ATLAS.estantes) {
      expect(ids.has(e.agente)).toBe(true)
      expect(e.guardaveis).toBeLessThanOrEqual(e.itens)
      expect(e.itens).toBeLessThanOrEqual(CLASSIFICACAO_ATLAS.classificados)
    }
    // todo especialista tem estante própria
    for (const a of AGENTES_ENGENHARIA.filter(x => x.matriz === 'especialidade')) {
      expect(CLASSIFICACAO_ATLAS.estantes.some(e => e.agente === a.id)).toBe(true)
    }
  })

  it('as notas da 1.ª volta são coerentes, só dos 12 especialistas, e dizem o seu limite', () => {
    expect(RESULTADO_PROVAS.aplicadoEm).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(RESULTADO_PROVAS.notas).toHaveLength(12)
    expect(RESULTADO_PROVAS.limite).toMatch(/engenheiro habilitado/)
    const ids = new Set(AGENTES_ENGENHARIA.filter(a => a.matriz === 'especialidade').map(a => a.id))
    let soma = 0
    for (const n of RESULTADO_PROVAS.notas) {
      expect(ids.has(n.agente)).toBe(true)
      expect(n.certos).toBeLessThanOrEqual(n.questoes)
      expect(n.nota).toBeCloseTo(10 * n.certos / n.questoes, 2)
      expect(n.veredito).toMatch(/^(aprovado|com supervisão|reprovado)$/)
      soma += n.questoes
    }
    expect(soma).toBeLessThanOrEqual(RESULTADO_PROVAS.questoesTotais)
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
    expect(screen.getAllByTestId('estante-agente')[0].textContent).toMatch(/Estante no Atlas:.*peças/)
    expect(screen.getAllByTestId('estado-agente')[0].textContent).toMatch(/nota 10,?\.?0 no cálculo|por provar/)
    fireEvent.click(screen.getByTestId('subaba-agentes-posicao'))
    expect(screen.getAllByTestId('ficha-agente')).toHaveLength(14)
    fireEvent.click(screen.getByTestId('subaba-agentes-mestre'))
    expect(screen.getAllByTestId('ficha-agente')).toHaveLength(4)
    fireEvent.click(screen.getAllByRole('button', { name: 'Ver o prompt completo' })[0])
    expect(screen.getByTestId('prompt-agente').textContent).toContain('Restrições invioláveis')
    fireEvent.click(screen.getByTestId('subaba-agentes-atlas'))
    expect(screen.getByTestId('atlas-fontes').textContent).toContain('216')
    expect(screen.getByTestId('atlas-numeros')).toBeTruthy()
    expect(screen.getByTestId('atlas-por-especialidade').querySelectorAll('tbody tr')).toHaveLength(14)
    expect(screen.getByTestId('atlas-classificacao').querySelectorAll('tbody tr')).toHaveLength(CLASSIFICACAO_ATLAS.estantes.length)
    fireEvent.click(screen.getByTestId('subaba-agentes-biblioteca'))
    expect(screen.getByTestId('biblioteca-atlas').textContent).toMatch(/peças escolhidas do corpus/)
    fireEvent.click(screen.getByTestId('subaba-agentes-provas'))
    expect(screen.getByTestId('tabela-provas').querySelectorAll('tbody tr')).toHaveLength(46)
    expect(screen.getByTestId('provas-agentes').textContent).toMatch(/engenheiro habilitado/)
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
