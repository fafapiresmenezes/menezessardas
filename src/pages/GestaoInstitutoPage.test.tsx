// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { ReactNode } from 'react'

vi.mock('@/components/Layout', () => ({ default: ({ children, title }: { children: ReactNode; title: string }) => <div><h1>{title}</h1>{children}</div> }))
const { default: GestaoInstitutoPage } = await import('./GestaoInstitutoPage')
const { PORTAIS_INSTITUTO } = await import('@/data/portais-instituto')

describe('Gestão do Instituto', () => {
  it('mostra todas as frentes com estado, as ferramentas e o que depende de M', () => {
    render(<MemoryRouter><GestaoInstitutoPage /></MemoryRouter>)
    expect(screen.getByText('Gestão do Instituto')).toBeTruthy()
    expect(screen.getByTestId('total-frentes').textContent).toBe(String(PORTAIS_INSTITUTO.length))
    for (const p of PORTAIS_INSTITUTO) expect(screen.getAllByText(p.nome).length).toBeGreaterThan(0)
    expect(screen.getByText('Agentes do Instituto')).toBeTruthy()
    expect(screen.getByTestId('pendencias-de-m')).toBeTruthy()
  })
})
