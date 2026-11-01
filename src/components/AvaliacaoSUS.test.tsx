// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup, within } from '@testing-library/react'

const rpc = vi.fn()
const insert = vi.fn(async () => ({ error: null }))
vi.mock('../lib/supabase', () => ({ supabaseConfigurado: true, supabase: { rpc, from: () => ({ insert }) } }))
const { default: AvaliacaoSUS, notaSUS } = await import('./AvaliacaoSUS')

describe('Avaliação SUS (usabilidade)', () => {
  beforeEach(() => { cleanup(); rpc.mockReset(); insert.mockClear() })

  it('calcula a nota de 0 a 100 pela fórmula de Brooke (ímpares v-1, pares 5-v, ×2,5)', () => {
    expect(notaSUS([5, 1, 5, 1, 5, 1, 5, 1, 5, 1])).toBe(100)
    expect(notaSUS([1, 5, 1, 5, 1, 5, 1, 5, 1, 5])).toBe(0)
    expect(notaSUS([4, 2, 4, 2, 4, 2, 4, 2, 4, 2])).toBe(75)
  })

  it('exige as 10 respostas, grava respostas e nota, agradece e mostra a média do escritório', async () => {
    rpc.mockResolvedValueOnce({ data: [{ media: 0, n: 0 }] }).mockResolvedValueOnce({ data: [{ media: 81.25, n: 2 }] })
    render(<AvaliacaoSUS />)
    expect(screen.queryByTestId('media-sus')).toBeNull()
    fireEvent.click(screen.getByTestId('enviar-sus'))
    expect((await screen.findByRole('status')).textContent).toBe('Responda as 10 afirmações.')
    for (let i = 1; i <= 10; i++) fireEvent.click(within(screen.getByRole('radiogroup', { name: `Afirmação ${i}` })).getByRole('radio', { name: i % 2 ? '5' : '1' }))
    expect(screen.getAllByRole('radio', { checked: true })).toHaveLength(10)
    fireEvent.click(screen.getByTestId('enviar-sus'))
    await waitFor(() => expect(insert).toHaveBeenCalledWith({ respostas: [5, 1, 5, 1, 5, 1, 5, 1, 5, 1], nota: 100 }))
    expect((await screen.findByRole('status')).textContent).toBe('Obrigado. Sua nota: 100 de 100.')
    expect((await screen.findByTestId('media-sus')).textContent).toBe('81')
    expect(screen.getByTestId('avaliacao-sus').textContent).toContain('2 respostas; mercado: 68')
  })
})
