// @vitest-environment jsdom
// Prova do quadradinho "Agentes do Instituto" (pedido de M, 18/11/2026): dados com evidência e página trancada.
import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, cleanup, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AGENTES_ACERVO, PRATICAS_DA_CASA, ACERVO_RESUMO } from '@/data/agentesAcervo'

vi.mock('@/components/Layout', () => ({ default: ({ title, children }: { title: string; children: React.ReactNode }) => <div><h1>{title}</h1>{children}</div> }))
vi.mock('@/components/CatalogoConsultores', () => ({ default: () => <div data-testid="catalogo-500" /> }))
const ehInstituto = vi.fn()
vi.mock('@/lib/equipe', () => ({ ehInstituto: (...a: unknown[]) => ehInstituto(...a) }))

import AgentesInstitutoPage from './AgentesInstitutoPage'

afterEach(cleanup)

describe('agentes do Instituto', () => {
  it('todo agente do acervo tem evidência contada e nenhum promete decidir sozinho', () => {
    expect(AGENTES_ACERVO.length).toBeGreaterThanOrEqual(10)
    for (const a of AGENTES_ACERVO) {
      expect(a.evidencia.ficheiros, a.id).toBeGreaterThan(0)
      expect(a.evidencia.bytes, a.id).toBeGreaterThan(0)
      expect(a.evidencia.exemplos.length, a.id).toBeGreaterThan(0)
      expect(a.oQueSabe.length, a.id).toBeGreaterThan(30)
    }
    const t = JSON.stringify(AGENTES_ACERVO).toLowerCase()
    for (const proibida of ['imbono', 'gemcorp']) expect(t).not.toContain(proibida)
    expect(PRATICAS_DA_CASA.length).toBeGreaterThanOrEqual(3)
    expect(ACERVO_RESUMO.ficheiros).toBeGreaterThan(100000)
  })

  it('membro do Instituto vê os agentes, as práticas e o catálogo dos 500', async () => {
    ehInstituto.mockResolvedValue(true)
    render(<MemoryRouter><AgentesInstitutoPage /></MemoryRouter>)
    await waitFor(() => expect(screen.getByTestId('agentes-acervo')).toBeTruthy())
    expect(screen.getByTestId('agentes-acervo').children.length).toBe(AGENTES_ACERVO.length)
    expect(screen.getByTestId('praticas-casa').children.length).toBe(PRATICAS_DA_CASA.length)
    expect(screen.getByTestId('catalogo-500')).toBeTruthy()
    expect(document.body.textContent).toContain('quem decide é sempre uma pessoa')
  })

  it('quem não é do Instituto não vê nada: a tranca manda para o Início', async () => {
    ehInstituto.mockResolvedValue(false)
    render(<MemoryRouter initialEntries={['/agentes-instituto']}><AgentesInstitutoPage /></MemoryRouter>)
    await waitFor(() => expect(screen.queryByTestId('agentes-acervo')).toBeNull())
  })
})
