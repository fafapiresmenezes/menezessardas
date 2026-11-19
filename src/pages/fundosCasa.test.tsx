// @vitest-environment jsdom
// Prova da casa própria dos fundos (19/11/2026): início com os quadradinhos dela,
// menu próprio sem nada da plataforma de direito, e palavras da casa.
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, cleanup, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import FundosInicioPage from './FundosInicioPage'
import { ECRAS_FUNDOS } from '@/data/ecrasFundos'
import { ECRAS_POR_NIVEL } from '@/lib/visaoFundos'

vi.mock('@/lib/supabase', () => ({ supabaseConfigurado: false, supabase: {} }))

afterEach(() => cleanup())

describe('casa própria dos fundos', () => {
  it('o início abre com a marca da casa e os quadradinhos do nível (presidente vê tudo)', () => {
    render(<MemoryRouter><FundosInicioPage /></MemoryRouter>)
    expect(screen.getAllByText('THEYE').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText(/fundos internacionais/i).length).toBeGreaterThanOrEqual(1)
    // Na vista padrão (presidente, N1) todos os 14 ecrãs aparecem: no menu e no quadradinho.
    for (const e of ECRAS_FUNDOS) expect(screen.getAllByText(e.nome).length, e.rota).toBeGreaterThanOrEqual(1)
    // Nada da moldura da plataforma de direito na casa dos fundos (os cargos da demonstração podem citar "jurídico").
    expect(document.body.textContent).not.toMatch(/suporte jur[ií]dico|peti[çc][aã]o|meu dia|theye\.club/i)
  })

  it('todo ecrã do mapa da casa existe na régua de níveis, e vice-versa', () => {
    const doMapa = new Set(ECRAS_FUNDOS.map(e => e.rota))
    for (const e of ECRAS_FUNDOS) expect(ECRAS_POR_NIVEL[e.rota], e.rota).toBeDefined()
    for (const rota of Object.keys(ECRAS_POR_NIVEL)) expect(doMapa.has(rota), rota).toBe(true)
  })

  it('obedece às palavras da casa: grafia de Angola, sem marca de cliente', () => {
    const t = JSON.stringify(ECRAS_FUNDOS.map(e => ({ n: e.nome, r: e.resumo })))
    for (const re of [/imbono/i, /gemcorp/i, /jur[ií]dic/i, /\busu[aá]rio/i, /\btela\b/i, /\bprojetos?\b/, /\bsetor\b/]) {
      expect(t).not.toMatch(re)
    }
  })
})
