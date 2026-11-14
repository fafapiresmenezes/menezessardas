// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import CadernoDeProdutosPage from './CadernoDeProdutosPage'
import { PRODUTOS, EIXOS, porEixo } from '@/data/produtos'

vi.mock('@/components/Layout', () => ({
  default: ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div><h1>{title}</h1>{children}</div>
  ),
}))

beforeEach(() => cleanup())
afterEach(() => cleanup())

describe('caderno de produtos refeito (M, 13/11/2026 23h12)', () => {
  it('traz os 21 produtos em 11 eixos, cada um com preço e prazo no cabeçalho', () => {
    render(<CadernoDeProdutosPage />)
    for (const p of PRODUTOS) {
      const li = screen.getByTestId(`caderno-produto-${p.numero}`)
      expect(li.textContent, String(p.numero)).toContain(p.preco)
      expect(li.textContent, String(p.numero)).toContain(p.prazo)
    }
  })

  it('divide o caderno por tema: cada eixo é uma seção com os seus produtos', () => {
    render(<CadernoDeProdutosPage />)
    for (const e of EIXOS) {
      const secao = screen.getByTestId(`secao-${e}`)
      for (const p of porEixo(e)) {
        expect(secao.contains(screen.getByTestId(`caderno-produto-${p.numero}`))).toBe(true)
      }
    }
  })

  it('o atalho do topo leva para o tema', () => {
    render(<CadernoDeProdutosPage />)
    for (const e of EIXOS) expect(screen.getByTestId(`atalho-${e}`).getAttribute('href')).toBe(`#tema-${e}`)
  })

  it('abrir um produto mostra o que é, o que vem junto, quem assina, prazo e preço médio', () => {
    render(<CadernoDeProdutosPage />)
    const primeiro = PRODUTOS[0]
    fireEvent.click(screen.getByTestId(`abrir-${primeiro.numero}`))
    const txt = screen.getByTestId(`caderno-produto-${primeiro.numero}`).textContent ?? ''
    expect(txt).toContain('O que é')
    expect(txt).toContain('O que vem junto')
    expect(txt).toContain('Quem assina')
    expect(txt).toContain('Preço médio de referência')
    for (const entrega of primeiro.entregas) expect(txt).toContain(entrega)
  })

  it('diz com todas as letras que preço é referência, não proposta', () => {
    render(<CadernoDeProdutosPage />)
    fireEvent.click(screen.getByTestId(`abrir-${PRODUTOS[0].numero}`))
    expect(document.body.textContent).toMatch(/refer[êe]ncia de conversa.*n[aã]o proposta/i)
  })

  it('tem o nome e o CNPJ do Instituto THEYE no rodapé', () => {
    render(<CadernoDeProdutosPage />)
    expect(screen.getByTestId('rodape-caderno').textContent).toContain('Instituto THEYE')
    expect(screen.getByTestId('rodape-caderno').textContent).toContain('70.134.451/0001-05')
  })
})
