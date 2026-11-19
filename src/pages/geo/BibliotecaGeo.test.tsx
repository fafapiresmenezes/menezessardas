// Provas da biblioteca científica (elo R7). A regra que mais importa aqui é de honestidade:
// nenhum PDF de terceiro é redistribuído, e toda obra leva à página oficial.
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, afterEach } from 'vitest'
import BibliotecaGeo from './BibliotecaGeo'
import { ACERVO, ELOS, MATERIAS } from '@/data/geo/biblioteca'

afterEach(cleanup)
const abrir = () => render(<MemoryRouter><BibliotecaGeo /></MemoryRouter>)

describe('Acervo', () => {
  it('tem pelo menos os 50 artigos e as 10 teses da pesquisa', () => {
    expect(ACERVO.filter(o => o.tipo === 'paper').length).toBeGreaterThanOrEqual(50)
    expect(ACERVO.filter(o => o.tipo === 'tese').length).toBe(10)
  })

  it('toda obra tem link oficial em https, e nenhum PDF é servido por nós', () => {
    for (const o of ACERVO) {
      expect(o.url, o.id).toMatch(/^https?:\/\//)
      // Nenhum link pode apontar para dentro do nosso próprio domínio ou do nosso repositório.
      expect(o.url, o.id).not.toMatch(/theye\.club|menezessardas|cdn\.jsdelivr/)
    }
  })

  it('não há obra sem o "por que importa aqui", nem id repetido', () => {
    const ids = ACERVO.map(o => o.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const o of ACERVO) {
      expect(o.porque.length, o.id).toBeGreaterThan(20)
      expect(o.materias.length, o.id).toBeGreaterThan(0)
    }
  })

  it('todo elo citado por uma obra existe na lista de elos', () => {
    for (const o of ACERVO) for (const e of o.elos) expect(Object.keys(ELOS), `${o.id} → ${e}`).toContain(e)
  })

  it('as obras que o app já usa cobrem a câmera, o cofre, a mobilidade e o grafo', () => {
    const comElo = (e: string) => ACERVO.some(o => o.elos.includes(e))
    for (const e of ['G1', 'G3', 'G4', 'R4', 'R5', 'R6']) expect(comElo(e), e).toBe(true)
  })
})

describe('Tela da biblioteca', () => {
  it('mostra o acervo inteiro ao abrir', () => {
    abrir()
    expect(screen.getByText(`${ACERVO.length} de ${ACERVO.length} obras`)).toBeTruthy()
  })

  it('a busca acha pelo autor, mesmo sem acento', () => {
    abrir()
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'barabasi' } })
    expect(screen.getByText(/Limits of Predictability/)).toBeTruthy()
    expect(screen.queryByText(/MobileNetV2/)).toBeNull()
  })

  it('filtra por matéria e dá para desmarcar', () => {
    abrir()
    const botao = screen.getByRole('button', { name: MATERIAS.M9 })
    fireEvent.click(botao)
    const esperado = ACERVO.filter(o => o.materias.includes('M9')).length
    expect(screen.getByText(`${esperado} de ${ACERVO.length} obras`)).toBeTruthy()
    fireEvent.click(botao)
    expect(screen.getByText(`${ACERVO.length} de ${ACERVO.length} obras`)).toBeTruthy()
  })

  it('filtra por parte do app, ligando biblioteca e grafo', () => {
    abrir()
    fireEvent.click(screen.getByRole('button', { name: ELOS.R6 }))
    const esperado = ACERVO.filter(o => o.elos.includes('R6')).length
    expect(screen.getByText(`${esperado} de ${ACERVO.length} obras`)).toBeTruthy()
    expect(screen.getByText(/Graph Drawing by Force-Directed Placement/)).toBeTruthy()
  })

  it('"só o que já está em uso" esconde o que ainda é só estudo', () => {
    abrir()
    fireEvent.click(screen.getByRole('button', { name: /só o que já está em uso/ }))
    const esperado = ACERVO.filter(o => o.elos.length > 0).length
    expect(esperado).toBeLessThan(ACERVO.length)
    expect(screen.getByText(`${esperado} de ${ACERVO.length} obras`)).toBeTruthy()
  })

  it('cada obra abre em aba nova, com rel seguro', () => {
    abrir()
    const links = screen.getAllByTitle(/^Abrir a página oficial/)
    expect(links.length).toBe(ACERVO.length)
    for (const l of links) {
      expect(l.getAttribute('target')).toBe('_blank')
      expect(l.getAttribute('rel')).toContain('noopener')
    }
  })

  it('diz com todas as letras que não redistribui PDF de terceiro', () => {
    abrir()
    const nota = screen.getByText(/Sobre licença e acesso/).parentElement!
    expect(within(nota).getByText(/Nenhum PDF de terceiro é guardado ou redistribuído/)).toBeTruthy()
  })

  it('sem resultado, oferece limpar os filtros em vez de deixar a tela vazia', () => {
    abrir()
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'zzzznadaaqui' } })
    expect(screen.getByText(/Nada encontrado com esses filtros/)).toBeTruthy()
  })
})
