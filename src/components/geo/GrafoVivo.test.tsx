// Provas do grafo desenhado (elo R6): que ele desenha, que dá para apertar um ponto
// e ver só as ligações dele, e que a origem de cada ligação aparece escrita.
import { describe, it, expect, afterEach } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import GrafoVivo from './GrafoVivo'
import type { Aresta, No } from '@/lib/geo/grafo'

const nos: No[] = [
  { id: 'titular', tipo: 'Titular', rotulo: 'M', props: {} },
  { id: 'l1', tipo: 'Lugar', rotulo: 'Casa', props: { visitas: 4 } },
  { id: 'l2', tipo: 'Lugar', rotulo: 'Escritório', props: { visitas: 3 } },
  { id: 'ibge:3301702', tipo: 'Municipio', rotulo: 'Duque de Caxias/RJ', props: { codigo_ibge: 3301702 } },
  { id: 'cena:0', tipo: 'Cena', rotulo: 'Rua', props: { pessoas: 0 } },
]
const arestas: Aresta[] = [
  { de: 'titular', para: 'l1', tipo: 'ESTEVE_EM', peso: 500, fonte: 'GPS do aparelho do titular' },
  { de: 'titular', para: 'l2', tipo: 'ESTEVE_EM', peso: 300, fonte: 'GPS do aparelho do titular' },
  { de: 'l1', para: 'ibge:3301702', tipo: 'FICA_EM', fonte: 'OpenStreetMap Nominatim + IBGE Localidades' },
  { de: 'titular', para: 'cena:0', tipo: 'OBSERVOU', fonte: 'Câmera do aparelho (COCO-SSD no aparelho)' },
  { de: 'l1', para: 'l2', tipo: 'VAI_PARA', peso: 0.67, fonte: 'Previsão: cadeia de Markov sobre as paradas do titular' },
]

afterEach(cleanup)

describe('Grafo desenhado na tela', () => {
  it('avisa com jeito quando ainda não há nada para desenhar', () => {
    render(<GrafoVivo nos={[]} arestas={[]} />)
    expect(screen.getByText(/ainda não há nada para desenhar/i)).toBeTruthy()
  })

  it('desenha um ponto apertável para cada nó, com o tipo dito em palavras', () => {
    render(<GrafoVivo nos={nos} arestas={arestas} />)
    expect(screen.getAllByRole('button', { name: /apertar para ver as ligações/i })).toHaveLength(5)
    expect(screen.getByRole('button', { name: /^Você: M\./ })).toBeTruthy()
    expect(screen.getByRole('button', { name: /^Município: Duque de Caxias\/RJ\./ })).toBeTruthy()
    expect(screen.getByRole('button', { name: /^Cena vista pela câmera: Rua\./ })).toBeTruthy()
  })

  it('apertar um ponto mostra as ligações dele e de onde veio cada uma', () => {
    render(<GrafoVivo nos={nos} arestas={arestas} />)
    fireEvent.click(screen.getByRole('button', { name: /^Lugar seu: Casa\./ }))
    const painel = screen.getByLabelText('Ligações de Casa')
    // Casa tem 3 ligações: esteve em, fica em, deve ir para
    expect(within(painel).getAllByRole('listitem')).toHaveLength(3)
    expect(within(painel).getByText(/OpenStreetMap Nominatim \+ IBGE Localidades/)).toBeTruthy()
    expect(within(painel).getByText(/deve ir para/)).toBeTruthy()
  })

  it('apertar o mesmo ponto de novo volta a mostrar o grafo inteiro', () => {
    render(<GrafoVivo nos={nos} arestas={arestas} />)
    const ponto = screen.getByRole('button', { name: /^Lugar seu: Casa\./ })
    fireEvent.click(ponto)
    expect(screen.getByLabelText('Ligações de Casa')).toBeTruthy()
    fireEvent.click(ponto)
    expect(screen.queryByLabelText('Ligações de Casa')).toBeNull()
  })

  it('a legenda explica cada formato, e diz que distância no desenho não é distância no mundo', () => {
    render(<GrafoVivo nos={nos} arestas={arestas} />)
    for (const t of ['Você', 'Lugar seu', 'Município', 'Cena vista pela câmera']) {
      expect(screen.getAllByText(t).length).toBeGreaterThan(0)
    }
    expect(screen.getByText(/é distância no mundo real/i)).toBeTruthy()
  })

  it('com muita notícia, corta o desenho e diz quantas ficaram de fora', () => {
    const muitas: No[] = [...nos, ...Array.from({ length: 15 }, (_, i) => ({ id: `g:${i}`, tipo: 'Noticia' as const, rotulo: `Notícia ${i}`, props: {} }))]
    render(<GrafoVivo nos={muitas} arestas={arestas} />)
    expect(screen.getByText(/5 notícia\(s\) ficaram fora do desenho/)).toBeTruthy()
  })
})
