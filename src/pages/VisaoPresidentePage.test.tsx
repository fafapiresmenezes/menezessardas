// Ecrã C01 (visão do presidente) — demonstração, dados fictícios. Falha se mostrar advocacia ou não listar os projectos.
import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, cleanup, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import VisaoPresidentePage from './VisaoPresidentePage'

vi.mock('@/components/Layout', () => ({ default: ({ children, title }: { children: React.ReactNode; title: string }) => <div><h1>{title}</h1>{children}</div> }))
afterEach(cleanup)

describe('visão do presidente', () => {
  it('lista todos os projectos de demonstração, cada um com uma cor', () => {
    const { getByTestId, container } = render(<MemoryRouter><VisaoPresidentePage /></MemoryRouter>)
    const itens = within(getByTestId('lista-projectos')).getAllByRole('listitem')
    expect(itens.length).toBe(3)
    for (const li of itens) expect(li.getAttribute('data-cor')).toMatch(/verde|amarelo|vermelho/)
    // Os cargos legítimos no selector "ver como" (Director jurídico) não contam como advocacia.
    const semCargos = (container.textContent ?? '').replace(/Director jur[ií]dico|Jur[ií]dico e conformidade/g, '')
    expect(semCargos).not.toMatch(/jur[ií]dic|processo|advoga/i)
  })

  it('mostra um aviso para o projecto com o boletim parado há mais tempo', () => {
    const { getByTestId } = render(<MemoryRouter><VisaoPresidentePage /></MemoryRouter>)
    // o projecto da água tem 16 dias parado nos dados de demonstração: tem de aparecer nos avisos
    expect(getByTestId('lista-avisos').textContent).toMatch(/água/i)
  })
})
