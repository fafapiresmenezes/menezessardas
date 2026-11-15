// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

vi.mock('@/components/Layout', () => ({ default: ({ title, children }: { title: string; children: React.ReactNode }) => <div><h1>{title}</h1>{children}</div> }))
const MapaDeReceitaPage = (await import('./MapaDeReceitaPage')).default
const { PRODUTOS, brl, pisoDe90Dias, semPreco } = await import('@/lib/predicao/receita')

afterEach(cleanup)

describe('tela do mapa de receita', () => {
  it('mostra o piso dos 90 dias, e chama de piso', () => {
    render(<MemoryRouter><MapaDeReceitaPage /></MemoryRouter>)
    expect(screen.getByTestId('piso').textContent).toBe(brl(pisoDe90Dias()))
    expect(document.body.textContent).toContain('Piso de 90 dias')
  })

  it('produto sem preço decidido aparece como "preço a definir" e fora da soma', () => {
    render(<MemoryRouter><MapaDeReceitaPage /></MemoryRouter>)
    const ordem = screen.getByTestId('ordem').textContent!
    expect(ordem.match(/preço a definir/g)!.length).toBe(semPreco().length)
    expect(ordem).toContain('fora da soma, porque o preço é decisão do dono')
  })

  it('todo produto diz quem compra, o que custa atender e o que falta', () => {
    render(<MemoryRouter><MapaDeReceitaPage /></MemoryRouter>)
    const ordem = screen.getByTestId('ordem').textContent!
    for (const p of PRODUTOS) {
      expect(ordem, p.nome).toContain(p.quemCompra)
      expect(ordem, p.nome).toContain(p.custoDeAtender)
      expect(ordem, p.nome).toContain(p.oQueFalta)
    }
  })

  it('diz que isto não é promessa de receita', () => {
    render(<MemoryRouter><MapaDeReceitaPage /></MemoryRouter>)
    expect(screen.getByTestId('nao-e-promessa').textContent).toContain('não é promessa de receita')
  })
})
