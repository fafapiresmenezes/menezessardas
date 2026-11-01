// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'

const contratos: Record<string, object> = {
  v1: { id: 'v1', imovelId: 'i1', contratoPaiId: 'c1', natureza: 'aditivo', tipo: 'locacao', parte: 'Maria Locatária', valor: 0, indice: 'igpm', garantia: 'caucao', dataInicio: '2026-01-10', dataVencimento: '2099-01-10', notas: 'Prorroga por 12 meses.' },
  s1: { id: 's1', imovelId: 'i1', contratoPaiId: 'c1', natureza: 'subcontrato', tipo: 'locacao', parte: 'Loja Sub', valor: 2500, indice: 'ipca', garantia: 'fianca', dataInicio: '2026-02-01', dataVencimento: null, notas: '' },
  c1: { id: 'c1', imovelId: 'i1', tipo: 'locacao', parte: 'João Locador', valor: 5000, indice: 'igpm', garantia: 'caucao', dataInicio: '2025-01-01', dataVencimento: '2027-01-01' },
}
vi.mock('@/lib/repositorio', () => ({ repositorio: { obterContrato: async (id: string) => contratos[id] ?? null } }))
vi.mock('@/components/Layout', () => ({ default: ({ title, children }: { title: string; children: React.ReactNode }) => <div><h1>{title}</h1>{children}</div> }))
const { default: VinculoPage } = await import('./VinculoPage')
const montar = (id: string) => render(<MemoryRouter initialEntries={[`/vinculo/${id}`]}><Routes><Route path="/vinculo/:id" element={<VinculoPage />} /></Routes></MemoryRouter>)

describe('Página do vínculo (aditivo ou subcontrato)', () => {
  beforeEach(cleanup)

  it('aditivo sem contraprestação: título, valor, índice, garantia, observações e link ao contrato-mãe', async () => {
    montar('v1')
    expect(screen.getByText('Carregando…')).toBeTruthy()
    expect((await screen.findByRole('heading', { level: 1 })).textContent).toBe('Aditivo — Maria Locatária')
    expect(screen.getByText('Sem contraprestação')).toBeTruthy()
    expect(screen.getByText('IGP-M')).toBeTruthy()
    expect(screen.getByText('10/01/2026')).toBeTruthy()
    expect(screen.getByText('Prorroga por 12 meses.')).toBeTruthy()
    expect(screen.getByText('Voltar ao contrato principal').closest('a')!.getAttribute('href')).toBe('/contrato/i1')
    expect((await screen.findByText(/João Locador/)).closest('a')!.getAttribute('href')).toBe('/contrato/i1')
  })

  it('subcontrato com valor e sem prazo; vínculo inexistente oferece voltar para imóveis', async () => {
    montar('s1')
    expect((await screen.findByRole('heading', { level: 1 })).textContent).toBe('Subcontrato — Loja Sub')
    expect(screen.getByText(/2\.500,00/)).toBeTruthy()
    expect(screen.getByText('Sem prazo')).toBeTruthy()
    cleanup(); montar('zzz')
    expect((await screen.findByRole('heading', { level: 1 })).textContent).toBe('Vínculo não encontrado')
    expect(screen.getByText('Voltar para imóveis').closest('a')!.getAttribute('href')).toBe('/imoveis')
  })
})
