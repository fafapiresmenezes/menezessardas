// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi, beforeEach } from 'vitest'
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

/**
 * O que estes testes prendem: que a tela de Pedir entrada manda o pedido pela função do servidor,
 * leva o motivo pré-escolhido da URL, e mostra o protocolo quando o pedido é registrado. Não
 * conferem o anti-spam do servidor — isso mora no teste da função pedir-entrada.
 */
const pedirEntrada = vi.fn()
vi.mock('@/lib/admissao', async (orig) => {
  const real = await orig<typeof import('@/lib/admissao')>()
  return { ...real, pedirEntrada: (...a: unknown[]) => pedirEntrada(...a) }
})

const AdmissaoPage = (await import('./AdmissaoPage')).default

afterEach(cleanup)
beforeEach(() => { pedirEntrada.mockReset() })

function renderEm(rota = '/admissao') {
  return render(<MemoryRouter initialEntries={[rota]}><AdmissaoPage /></MemoryRouter>)
}

describe('Pedir entrada', () => {
  it('envia o pedido e mostra o protocolo', async () => {
    pedirEntrada.mockResolvedValue({ recibo: { protocolo: 'PE-20261114-AB12', criado_em: '2026-11-14T02:30:00Z' } })
    renderEm()
    fireEvent.change(screen.getByLabelText(/Seu nome/i), { target: { value: 'Ana Advogada' } })
    fireEvent.change(screen.getByLabelText(/^E-mail/i), { target: { value: 'ana@silva.adv.br' } })
    fireEvent.click(screen.getByRole('button', { name: /Enviar pedido/i }))
    await waitFor(() => expect(screen.getByTestId('protocolo').textContent).toContain('PE-20261114-AB12'))
    const enviado = pedirEntrada.mock.calls[0][0]
    expect(enviado.nome).toBe('Ana Advogada')
    expect(enviado.email).toBe('ana@silva.adv.br')
    expect(typeof enviado.ms).toBe('number')
  })

  it('mostra a mensagem de erro que o servidor devolve', async () => {
    pedirEntrada.mockResolvedValue({ erro: 'Já recebemos vários pedidos desta rede hoje.' })
    renderEm()
    fireEvent.change(screen.getByLabelText(/Seu nome/i), { target: { value: 'Teste' } })
    fireEvent.change(screen.getByLabelText(/^E-mail/i), { target: { value: 'a@b.com' } })
    fireEvent.click(screen.getByRole('button', { name: /Enviar pedido/i }))
    await waitFor(() => expect(screen.getByTestId('erro-entrada').textContent).toMatch(/desta rede hoje/))
  })

  it('leva o motivo pré-escolhido da URL para o pedido', async () => {
    pedirEntrada.mockResolvedValue({ recibo: { protocolo: 'PE-X', criado_em: '2026-11-14T02:30:00Z' } })
    renderEm('/admissao?motivo=proposta&frente=engenharia')
    fireEvent.change(screen.getByLabelText(/Seu nome/i), { target: { value: 'B' } })
    fireEvent.change(screen.getByLabelText(/^E-mail/i), { target: { value: 'b@b.com' } })
    fireEvent.click(screen.getByRole('button', { name: /Enviar pedido/i }))
    await waitFor(() => expect(pedirEntrada).toHaveBeenCalled())
    const enviado = pedirEntrada.mock.calls[0][0]
    expect(enviado.motivo).toBe('proposta')
    expect(enviado.frente).toBe('engenharia')
  })
})
