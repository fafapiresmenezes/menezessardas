import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, cleanup, within, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import CarteiraProjectosPage from './CarteiraProjectosPage'
vi.mock('@/components/Layout', () => ({ default: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }))
afterEach(cleanup)
describe('carteira de projectos', () => {
  it('lista os três projectos e filtra por país', () => {
    const { getByTestId, getByTitle } = render(<MemoryRouter><CarteiraProjectosPage /></MemoryRouter>)
    expect(within(getByTestId('carteira')).getAllByRole('listitem').length).toBe(3)
    fireEvent.change(getByTitle('Filtrar os projectos por país'), { target: { value: 'NA' } })
    expect(within(getByTestId('carteira')).getAllByRole('listitem').length).toBe(1)
  })
})
