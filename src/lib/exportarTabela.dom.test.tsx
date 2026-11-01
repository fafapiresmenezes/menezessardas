// @vitest-environment jsdom
// Passo 524: leitura de uma <table> da tela (cabeçalho, colunas de ações ignoradas, título) e PDF da grade.
import { describe, it, expect, beforeEach } from 'vitest'
import { lerTabela, paraPdf, paraCsv } from './exportarTabela'

const montar = (html: string) => { document.body.innerHTML = html; return document.querySelector('table') as HTMLTableElement }

describe('lerTabela', () => {
  beforeEach(() => { document.body.innerHTML = '' })

  it('usa o <thead>, ignora a coluna "Ações" e colunas vazias, limpa espaços e tira linhas vazias', () => {
    const t = montar(`<section><h2>Contratos  vigentes</h2><div><table>
      <thead><tr><th>Imóvel</th><th> Valor </th><th></th><th>Ações</th></tr></thead>
      <tbody>
        <tr><td>Rua A,\n 10</td><td>R$ 1.000</td><td></td><td><button>Editar</button></td></tr>
        <tr><td></td><td></td><td></td><td><button>x</button></td></tr>
        <tr><td>Rua B</td><td></td><td></td><td></td></tr>
      </tbody></table></div></section>`)
    const g = lerTabela(t, 'Padrão')
    expect(g.titulo).toBe('Contratos vigentes')
    expect(g.cabecalho).toEqual(['Imóvel', 'Valor'])
    expect(g.linhas).toEqual([['Rua A, 10', 'R$ 1.000'], ['Rua B', '']])
  })

  it('sem <thead> a primeira linha é o cabeçalho; <caption> vence o título anterior; sem nada usa o padrão; coluna vazia com dados fica', () => {
    const t = montar(`<h3>Antes</h3><table><caption> Minha  grade </caption><tr><th>A</th><th></th></tr><tr><td>1</td><td>2</td></tr></table>`)
    const g = lerTabela(t, 'Padrão')
    expect(g.titulo).toBe('Minha grade')
    expect(g.cabecalho).toEqual(['A', ''])
    expect(g.linhas).toEqual([['1', '2']])
    const t2 = montar(`<div><table><tr><td>só corpo</td></tr></table></div>`)
    expect(lerTabela(t2, 'Padrão').titulo).toBe('Padrão')
    const t3 = montar(`<main><div><h2>Título longe</h2></div><div><p>x</p><table><tr><td>a</td></tr></table></div></main>`)
    expect(lerTabela(t3, 'Padrão').titulo).toBe('Título longe')
  })

  it('a grade lida vira CSV coerente e PDF válido com cabeçalho do escritório', () => {
    const t = montar(`<table><thead><tr><th>Nome</th><th>Valor</th></tr></thead><tbody><tr><td>Ana</td><td>10</td></tr><tr><td>Bia; Cia</td><td></td></tr></tbody></table>`)
    const g = lerTabela(t, 'Honorários')
    expect(paraCsv(g)).toBe('﻿Nome;Valor\r\nAna;10\r\n"Bia; Cia";\r\n')
    const pdf = paraPdf(g, 'Honorários')
    const texto = new TextDecoder('latin1').decode(pdf)
    expect(texto.startsWith('%PDF-')).toBe(true)
    expect(texto).toContain('GMenezes Advogados Associados')
    expect(texto).toContain('Nome: Ana')
    expect(texto).toContain('Valor: -')
    expect(texto).toContain('2 linha')
    expect(texto).toContain('Desenvolvido pelo Instituto THEYE.')
    expect(texto.trimEnd().endsWith('%%EOF')).toBe(true)
  })
})
