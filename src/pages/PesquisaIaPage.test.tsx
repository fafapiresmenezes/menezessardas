// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

vi.mock('@/components/Layout', () => ({ default: ({ title, children }: { title: string; children: React.ReactNode }) => <div><h1>{title}</h1>{children}</div> }))
const PesquisaIaPage = (await import('./PesquisaIaPage')).default
const { LINHAS } = await import('@/lib/ia/agenda')

afterEach(cleanup)

describe('agenda de pesquisa publicada', () => {
  it('toda linha aparece com hipótese, medida e o que a invalidaria', () => {
    render(<MemoryRouter><PesquisaIaPage /></MemoryRouter>)
    const t = document.body.textContent!
    for (const l of LINHAS) expect(t).toContain(l.titulo)
    expect(t.match(/O que invalidaria:/g)).toHaveLength(LINHAS.length)
  })

  it('a tela diz, antes de tudo, que a plataforma não é superinteligente', () => {
    render(<MemoryRouter><PesquisaIaPage /></MemoryRouter>)
    expect(screen.getByTestId('nao-afirmamos').textContent).toContain('não é superinteligente')
  })

  it('a política de segurança está na tela, não só no documento', () => {
    render(<MemoryRouter><PesquisaIaPage /></MemoryRouter>)
    expect(screen.getByTestId('politica').textContent).toContain('revisão humana')
  })
})
