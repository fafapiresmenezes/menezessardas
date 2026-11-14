import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'fs'

// Queixa do M de 12/11/2026: "dica ao passar o cursor em tudo". A plataforma está vendida a um
// escritório real, e a régua combinada é que cada coisa na tela faça sentido para um advogado SEM
// explicação. Um botão escrito só "Salvar" não diz o que vai ser salvo nem o que acontece depois.
//
// A regra que este teste faz valer é objetiva: todo <button> das telas e dos componentes tem de
// trazer, na própria etiqueta de abertura, `title` (a dica que aparece ao passar o cursor) ou
// `aria-label` (o nome que o leitor de tela diz). Só o texto de dentro do botão não basta.
//
// O que o teste NÃO julga, porque não dá para medir por fora: se a dica explica a CONSEQUÊNCIA
// ("guarda o seu aceite, com data e hora") em vez de repetir o rótulo ("aceitar"). Dica que só
// repete o rótulo passa neste teste e continua sendo dica ruim.

/** Fim da etiqueta de abertura a partir de `de`, respeitando o que está dentro de {}. */
function fimDaTag(fonte: string, de: number): number {
  let prof = 0
  for (let i = de; i < fonte.length; i++) {
    const c = fonte[i]
    if (c === '{') prof++
    else if (c === '}') prof--
    else if (c === '>' && prof === 0) return i + 1
  }
  return fonte.length
}

function botoes(fonte: string): string[] {
  const achados: string[] = []
  for (let i = fonte.indexOf('<button'); i !== -1; i = fonte.indexOf('<button', i + 1)) {
    achados.push(fonte.slice(i, fimDaTag(fonte, i)))
  }
  return achados
}

const arquivos = (pasta: string) =>
  readdirSync(pasta).filter(f => f.endsWith('.tsx') && !f.includes('.test.')).map(f => `${pasta}/${f}`)

describe('dica ao passar o cursor', () => {
  it('todo botão das telas e dos componentes traz title ou aria-label', () => {
    const faltando: string[] = []
    let total = 0
    for (const arq of [...arquivos('src/pages'), ...arquivos('src/components')]) {
      const fonte = readFileSync(arq, 'utf8')
      for (const tag of botoes(fonte)) {
        total++
        if (!/\btitle=/.test(tag) && !/\baria-label=/.test(tag)) {
          const linha = fonte.slice(0, fonte.indexOf(tag)).split('\n').length
          faltando.push(`${arq}:${linha} ${tag.replace(/\s+/g, ' ').slice(0, 90)}`)
        }
      }
    }
    expect(total, 'nenhum botão encontrado: o leitor de botões quebrou').toBeGreaterThan(500)
    expect(faltando, `botão sem dica ao passar o cursor:\n${faltando.join('\n')}`).toEqual([])
  })

  it('a dica não é uma frase vazia nem um rótulo de uma palavra só', () => {
    const curtas: string[] = []
    for (const arq of [...arquivos('src/pages'), ...arquivos('src/components')]) {
      for (const tag of botoes(readFileSync(arq, 'utf8'))) {
        const dica = tag.match(/\btitle="([^"]*)"/)?.[1]
        if (dica !== undefined && dica.trim().split(/\s+/).length < 2) curtas.push(`${arq}: "${dica}"`)
      }
    }
    expect(curtas, `dica curta demais para explicar o que o botão faz:\n${curtas.join('\n')}`).toEqual([])
  })
})
