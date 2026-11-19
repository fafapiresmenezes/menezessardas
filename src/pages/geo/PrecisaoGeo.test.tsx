// Provas da tela de precisão em campo (elo R10). O que importa: ela não deixa medir sem ponto de
// referência com fonte, e não dá nota com poucas leituras.
import { describe, it, expect, afterEach, vi, beforeEach } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import PrecisaoGeo from './PrecisaoGeo'

const montar = () => render(<MemoryRouter><PrecisaoGeo /></MemoryRouter>)

beforeEach(() => {
  Object.defineProperty(navigator, 'geolocation', {
    configurable: true,
    value: { watchPosition: vi.fn(() => 1), clearWatch: vi.fn() },
  })
})
afterEach(cleanup)

const preencher = (lat: string, lon: string, fonte: string) => {
  fireEvent.change(screen.getByPlaceholderText('-22.780000'), { target: { value: lat } })
  fireEvent.change(screen.getByPlaceholderText('-43.310000'), { target: { value: lon } })
  fireEvent.change(screen.getByPlaceholderText('Marco IBGE 93847, BDG'), { target: { value: fonte } })
}

describe('a porta da medição', () => {
  it('abre explicando que a margem mostrada vinha do próprio aparelho e nunca foi conferida', () => {
    montar()
    expect(screen.getByText(/Pôr a precisão à prova/)).toBeTruthy()
    expect(screen.getByText(/quanto o aparelho erra de verdade/i)).toBeTruthy()
  })

  it('manda buscar a coordenada no IBGE, com link que abre em outra aba', () => {
    montar()
    const link = screen.getByTitle(/Banco de Dados Geodésicos do IBGE/i)
    expect(link.getAttribute('href')).toBe('https://bdg.ibge.gov.br/')
    expect(link.getAttribute('target')).toBe('_blank')
    expect(link.getAttribute('rel')).toContain('noopener')
  })

  it('NÃO deixa medir antes de ter ponto de referência', () => {
    montar()
    expect(screen.getByTitle(/Preencha primeiro o ponto de referência/).hasAttribute('disabled')).toBe(true)
  })

  it('coordenada sem fonte não vale: o botão continua travado e a tela diz o que falta', () => {
    montar()
    preencher('-22.78', '-43.31', '')
    expect(screen.getByText(/Faltou algo/)).toBeTruthy()
    expect(screen.getByTitle(/Preencha primeiro o ponto de referência/).hasAttribute('disabled')).toBe(true)
  })

  it('coordenada fora do mundo é recusada', () => {
    montar()
    preencher('-200', '-43.31', 'marco de teste')
    expect(screen.getByText(/Faltou algo/)).toBeTruthy()
  })

  it('com as duas coordenadas e a fonte, o botão libera', () => {
    montar()
    preencher('-22.78', '-43.31', 'Marco IBGE 93847')
    expect(screen.queryByText(/Faltou algo/)).toBeNull()
    expect(screen.getByTitle(/Começar a colher leituras/).hasAttribute('disabled')).toBe(false)
  })

  it('aceita vírgula como separador decimal, que é como se escreve em português', () => {
    montar()
    preencher('-22,78', '-43,31', 'Marco IBGE 93847')
    expect(screen.queryByText(/Faltou algo/)).toBeNull()
  })
})

describe('a honestidade da tela', () => {
  it('diz, antes de medir, que faltam leituras para fechar a conta', () => {
    montar()
    preencher('-22.78', '-43.31', 'Marco IBGE 93847')
    fireEvent.click(screen.getByTitle(/Começar a colher leituras/))
    expect(screen.getByText(/faltam 30 para fechar a conta/)).toBeTruthy()
  })

  it('avisa que as leituras não saem da tela nem entram no cofre', () => {
    montar()
    expect(screen.getByText(/nada é enviado e nada entra no seu cofre/i)).toBeTruthy()
  })

  it('publica o método inteiro, numerado, para qualquer pessoa repetir', () => {
    montar()
    expect(screen.getByText(/O método, para qualquer pessoa repetir/)).toBeTruthy()
    expect(screen.getByText(/Sem fonte, não é referência/)).toBeTruthy()
  })

  it('não mostra resultado nenhum antes de existir leitura', () => {
    montar()
    expect(screen.queryByText(/erro mediano/i)).toBeNull()
    expect(screen.queryByText(/Copiar o resultado/)).toBeNull()
  })
})
