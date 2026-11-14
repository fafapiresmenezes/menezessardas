// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import CadernoDeProdutosPage from './CadernoDeProdutosPage'
import { PRODUTOS } from '@/data/produtos'
import { PRECOS_CADERNO } from '@/data/precos-caderno'
import { FAMILIAS, CADERNO, familiasComProdutos } from '@/data/caderno-familias'

vi.mock('@/components/Layout', () => ({
  default: ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div><h1>{title}</h1>{children}</div>
  ),
}))

const montar = () => render(<MemoryRouter><CadernoDeProdutosPage /></MemoryRouter>)
const detalhe = (n: number) => PRODUTOS.find(p => p.numero === n)!

beforeEach(() => cleanup())
afterEach(() => cleanup())

describe('caderno em 6 famílias pela dor do cliente (erro #8)', () => {
  it('traz os 21 serviços, cada um com a faixa de referência e o prazo no cabeçalho', () => {
    montar()
    for (const c of CADERNO) {
      const li = screen.getByTestId(`caderno-produto-${c.numero}`)
      expect(li.textContent, String(c.numero)).toContain(PRECOS_CADERNO[c.numero])
      expect(li.textContent, String(c.numero)).toContain(detalhe(c.numero).prazo)
      expect(li.textContent, String(c.numero)).toContain(c.nome)
    }
  })

  it('divide o caderno por família, cada uma com os seus serviços e a escada de compra', () => {
    montar()
    for (const f of familiasComProdutos()) {
      const secao = screen.getByTestId(`secao-${f.id}`)
      expect(screen.getByTestId(`escada-${f.id}`)).toBeTruthy()
      for (const c of f.fichas) {
        expect(secao.contains(screen.getByTestId(`caderno-produto-${c.numero}`))).toBe(true)
      }
    }
  })

  it('o atalho do topo leva para a família', () => {
    montar()
    for (const f of FAMILIAS) expect(screen.getByTestId(`atalho-${f.id}`).getAttribute('href')).toBe(`#familia-${f.id}`)
  })

  it('abrir um serviço mostra para quem, o que recebe, quem assina, o que levar e o botão de conversa', () => {
    montar()
    const c = CADERNO[0]
    fireEvent.click(screen.getByTestId(`abrir-${c.numero}`))
    const txt = screen.getByTestId(`caderno-produto-${c.numero}`).textContent ?? ''
    expect(txt).toContain('Para quem é')
    expect(txt).toContain('O que você recebe')
    expect(txt).toContain('Quem assina')
    expect(txt).toContain('O que levar à conversa')
    expect(txt).toContain('equipe do Instituto está em formação')
    for (const entrega of detalhe(c.numero).entregas) expect(txt).toContain(entrega)
    expect(screen.getByTestId(`pedir-conversa-${c.numero}`).getAttribute('href')).toBe('/settings')
  })

  it('o valor é faixa de referência, não oferta', () => {
    montar()
    fireEvent.click(screen.getByTestId(`abrir-${CADERNO[0].numero}`))
    expect(document.body.textContent).toMatch(/faixa de refer[êe]ncia de conversa, n[aã]o proposta/i)
  })

  it('marca o que ainda precisa de lastro e leva à tela /lastro', () => {
    montar()
    const comLastro = CADERNO.find(c => c.precisaLastro)!
    fireEvent.click(screen.getByTestId(`abrir-${comLastro.numero}`))
    const marca = screen.getByTestId(`lastro-${comLastro.numero}`)
    expect(marca.querySelector('a')?.getAttribute('href')).toBe('/lastro')
  })

  it('tem o nome e o CNPJ do Instituto THEYE no rodapé', () => {
    montar()
    expect(screen.getByTestId('rodape-caderno').textContent).toContain('Instituto THEYE')
    expect(screen.getByTestId('rodape-caderno').textContent).toContain('70.134.451/0001-05')
  })
})
