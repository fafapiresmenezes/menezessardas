// @vitest-environment jsdom
// Pedido de M (18/11/2026): Sardas e Menezes não pode ver a parte do Instituto de jeito nenhum,
// nem digitando o endereço. Só quem administra o Instituto passa por esta porta.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, cleanup } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import SoInstituto from './SoInstituto'

const instituto = vi.fn()
vi.mock('@/lib/equipe', () => ({ ehInstituto: () => instituto() }))

const montar = () => render(
  <MemoryRouter initialEntries={['/instituto']}>
    <Routes>
      <Route path="/instituto" element={<SoInstituto><p>tela do instituto</p></SoInstituto>} />
      <Route path="/inicio" element={<p>inicio do escritorio</p>} />
    </Routes>
  </MemoryRouter>,
)

beforeEach(() => { cleanup(); vi.clearAllMocks() })

describe('porta das telas do Instituto', () => {
  it('quem administra o Instituto vê a tela', async () => {
    instituto.mockResolvedValue(true)
    montar()
    expect(await screen.findByText('tela do instituto')).toBeTruthy()
  })
  it('quem é do escritório cliente volta para o Início, mesmo digitando o endereço', async () => {
    instituto.mockResolvedValue(false)
    montar()
    expect(await screen.findByText('inicio do escritorio')).toBeTruthy()
    expect(screen.queryByText('tela do instituto')).toBeNull()
  })
  it('se o banco não responder, a porta fica fechada', async () => {
    instituto.mockRejectedValue(new Error('sem rede'))
    montar()
    await waitFor(() => expect(screen.queryByText('inicio do escritorio')).toBeTruthy())
  })
})
