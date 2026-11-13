// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { endereco, dominio, modoPara, lembrarModo, registrarVisita, historico, alternarFavorito, favoritos, abrirJanelaAoLado, SITES } from './navegador'

describe('Navegador interno: endereços, modos e memória', () => {
  beforeEach(() => localStorage.clear())

  it('entende URL completa, domínio solto e termo de pesquisa', () => {
    expect(endereco('https://www.stj.jus.br/x')).toBe('https://www.stj.jus.br/x')
    expect(endereco('tjrj.jus.br')).toBe('https://tjrj.jus.br/')
    expect(endereco('www.planalto.gov.br/ccivil_03')).toBe('https://www.planalto.gov.br/ccivil_03')
    expect(endereco('despejo por falta de pagamento')).toBe('https://www.google.com/search?q=despejo%20por%20falta%20de%20pagamento')
    expect(endereco('0006978-02.2021.8.19.0212')).toContain('google.com/search')
    expect(endereco('   ')).toBeNull()
    expect(dominio('https://www.tjrj.jus.br/a')).toBe('tjrj.jus.br')
  })

  it('sites que bloqueiam começam na janela ao lado; Planalto e Wikipédia abrem aqui; a escolha fica lembrada', () => {
    expect(modoPara('https://www.google.com/search?q=x')).toBe('janela')
    expect(modoPara('https://www3.tjrj.jus.br/consultaprocessual/')).toBe('janela')
    expect(modoPara('https://www.jusbrasil.com.br/busca?q=x')).toBe('janela')
    expect(modoPara('https://www.planalto.gov.br/ccivil_03/leis/l8245.htm')).toBe('aqui')
    expect(modoPara('https://pt.wikipedia.org/wiki/Direito')).toBe('aqui')
    expect(modoPara('https://exemplo.com.br/')).toBe('aqui')
    lembrarModo('https://exemplo.com.br/a', 'janela')
    expect(modoPara('https://exemplo.com.br/b')).toBe('janela')
  })

  it('guarda histórico sem repetir e alterna favoritos', () => {
    registrarVisita('https://a.com/', 'A'); registrarVisita('https://b.com/', 'B'); registrarVisita('https://a.com/', 'A')
    expect(historico().map(v => v.url)).toEqual(['https://a.com/', 'https://b.com/'])
    alternarFavorito('https://a.com/', 'A')
    expect(favoritos()).toHaveLength(1)
    alternarFavorito('https://a.com/', 'A')
    expect(favoritos()).toHaveLength(0)
  })

  it('a janela ao lado é sempre a mesma (reaproveitada) e sem ligação de volta', () => {
    const janela = { opener: {}, focus: vi.fn() }
    const open = vi.spyOn(window, 'open').mockReturnValue(janela as unknown as Window)
    expect(abrirJanelaAoLado('https://www.stj.jus.br/')).toBe(true)
    expect(open.mock.calls[0][1]).toBe('theye-navegador')
    expect(open.mock.calls[0][2]).toContain('popup')
    expect(janela.opener).toBeNull()
    open.mockReturnValue(null)
    expect(abrirJanelaAoLado('https://www.stj.jus.br/')).toBe(false)
    open.mockRestore()
  })

  it('todos os atalhos têm endereço https válido', () => {
    for (const s of SITES) {
      expect(new URL(s.url).protocol).toBe('https:')
      if (s.busca) expect(new URL(s.busca('teste de busca')).protocol).toBe('https:')
    }
  })
})
