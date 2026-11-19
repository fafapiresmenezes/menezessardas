// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { NORMAS_AGUAS } from '@/data/aguas'

vi.mock('@/components/Layout', () => ({ default: ({ title, children }: { title: string; children: React.ReactNode }) => <div><h1>{title}</h1>{children}</div> }))
const AguasPage = (await import('./AguasPage')).default
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
})
