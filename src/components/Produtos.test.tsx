// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Produtos from './Produtos'
import Doacoes from './Doacoes'
import { PRODUTOS, EIXOS } from '@/data/produtos'
import { DICIONARIOS, reiniciarIdioma, trocarIdioma, type Chave } from '@/lib/i18n'
import { IDIOMAS } from '@/lib/idioma'

/**
 * Pedido de M em 13/11/2026 21:35: aba Produtos acima do quadro das vertentes, com o caderno que
 * fizemos, e espaço para doações.
 *
 * O que estes testes prendem: os 21 produtos e os 11 eixos na vitrine, nenhum preço na porta,
 * tudo levando à entrada, tradução nas quatro línguas, e a doação sem meio de pagamento inventado.
 */
beforeEach(() => { cleanup(); localStorage.clear(); reiniciarIdioma() })
afterEach(() => { localStorage.clear(); reiniciarIdioma() })

const montar = (quem: 'produtos' | 'doacoes' = 'produtos') =>
  render(<MemoryRouter>{quem === 'produtos' ? <Produtos /> : <Doacoes />}</MemoryRouter>)

describe('vitrine de produtos na porta', () => {
  it('mostra os 21 produtos e os 11 eixos do caderno', () => {
    montar()
    expect(PRODUTOS.length).toBe(21)
    expect(EIXOS.length).toBe(11)
    for (const p of PRODUTOS) expect(screen.getByTestId(`produto-${p.numero}`), String(p.numero)).toBeTruthy()
    for (const e of EIXOS) expect(screen.getByTestId(`eixo-${e}`), e).toBeTruthy()
  })

  it('não mostra preço nenhum na porta de entrada', () => {
    montar()
    const texto = screen.getByTestId('produtos').textContent!
    expect(texto).not.toMatch(/R\$/)
    for (const p of PRODUTOS) expect(texto, p.preco).not.toContain(p.preco)
    expect(screen.getByTestId('produtos-sem-preco').textContent).toBeTruthy()
  })

  it('o caderno só abre depois da senha: o botão leva à entrada', () => {
    montar()
    expect(screen.getByTestId('produtos-entrar').getAttribute('href')).toBe('/login?ir=%2Fcaderno-de-produtos')
  })

  it('cada eixo diz quantos produtos tem, e a soma fecha com o caderno', () => {
    montar()
    const soma = EIXOS.reduce((s, e) => s + PRODUTOS.filter(p => p.eixo === e).length, 0)
    expect(soma).toBe(PRODUTOS.length)
  })

  it('fala a língua escolhida, e o chinês não repete o português', () => {
    for (const chave of ['produtos.titulo', 'produtos.resumo', 'produtos.semPreco', 'doacoes.resumo'] as Chave[]) {
      for (const i of IDIOMAS) expect(DICIONARIOS[i.codigo][chave], `${i.codigo} ${chave}`).toBeTruthy()
      expect(DICIONARIOS.zh[chave], chave).not.toBe(DICIONARIOS.pt[chave])
      expect(DICIONARIOS.es[chave], chave).not.toBe(DICIONARIOS.pt[chave])
    }
    trocarIdioma('zh')
    montar()
    expect(screen.getByTestId('produtos').textContent).toContain(DICIONARIOS.zh['produtos.titulo'])
  })

  it('o nome de cada eixo existe nas quatro línguas', () => {
    for (const e of EIXOS) {
      for (const i of IDIOMAS) expect(DICIONARIOS[i.codigo][`eixo.${e}` as Chave], `${i.codigo} ${e}`).toBeTruthy()
    }
  })
})

describe('espaço de doação', () => {
  it('mostra as três formas de apoio', () => {
    montar('doacoes')
    for (const n of [1, 2, 3]) expect(screen.getByTestId(`doacao-forma-${n}`).textContent).toBeTruthy()
  })

  it('não inventa meio de pagamento: nenhuma chave PIX, cartão ou link de doação', () => {
    montar('doacoes')
    const texto = screen.getByTestId('doacoes').textContent!
    expect(texto).not.toMatch(/pix|cart[ãa]o|iban|swift|ag[êe]ncia|conta n|\d{3}\.\d{3}\.\d{3}/i)
    expect(screen.getByTestId('doacao-destino').textContent).toBeTruthy()
    expect(screen.getByTestId('doacoes-entrar').getAttribute('href')).toBe('/login?ir=%2Finstituto')
  })

  it('em espanhol a doação fala espanhol', () => {
    trocarIdioma('es')
    montar('doacoes')
    expect(screen.getByTestId('doacoes').textContent).toContain(DICIONARIOS.es['doacoes.titulo'])
  })
})
