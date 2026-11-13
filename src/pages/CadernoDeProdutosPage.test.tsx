// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import CadernoDeProdutosPage from './CadernoDeProdutosPage'
import { PRODUTOS, porEixo } from '@/data/produtos'

vi.mock('@/components/Layout', () => ({
  default: ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div><h1>{title}</h1>{children}</div>
  ),
}))

beforeEach(() => cleanup())
afterEach(() => cleanup())

describe('caderno de produtos, depois da senha', () => {
  it('mostra os 21 produtos com preço e prazo', () => {
    render(<CadernoDeProdutosPage />)
    for (const p of PRODUTOS) {
      const li = screen.getByTestId(`caderno-produto-${p.numero}`)
      expect(li.textContent, String(p.numero)).toContain(p.preco)
      expect(li.textContent, String(p.numero)).toContain(p.prazo)
    }
  })

  it('diz que preço é média de referência, não proposta fechada', () => {
    render(<CadernoDeProdutosPage />)
    expect(screen.getByTestId('aviso-preco').textContent).toMatch(/pre[çc]o m[ée]dio de refer[êe]ncia/i)
  })

  it('o filtro por eixo mostra só os daquele eixo', () => {
    render(<CadernoDeProdutosPage />)
    fireEvent.click(screen.getByTestId('filtro-quantica'))
    const vistos = porEixo('quantica')
    expect(vistos.length).toBeGreaterThan(0)
    for (const p of vistos) expect(screen.getByTestId(`caderno-produto-${p.numero}`)).toBeTruthy()
    const fora = PRODUTOS.find(p => p.eixo !== 'quantica')!
    expect(screen.queryByTestId(`caderno-produto-${fora.numero}`)).toBeNull()
  })

  it('cada produto traz as entregas e para quem é', () => {
    render(<CadernoDeProdutosPage />)
    for (const p of PRODUTOS) {
      const li = screen.getByTestId(`caderno-produto-${p.numero}`)
      expect(p.entregas.length, String(p.numero)).toBeGreaterThan(0)
      expect(li.textContent, String(p.numero)).toContain(p.entregas[0])
      expect(li.textContent, String(p.numero)).toContain(p.paraQuem)
    }
  })
})
