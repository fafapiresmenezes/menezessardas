import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'fs'

// Passo A27, pedaço "toda tela vazia diz o que fazer primeiro".
//
// Tela vazia é o primeiro contato de quem acabou de entrar na plataforma: no dia em que a Dra.
// Fátima abrir a conta nova, TODAS as telas estarão vazias. Uma tela que só diz "Nenhum registro"
// deixa a pessoa parada. Este teste faz valer duas regras pequenas e objetivas:
//
//   1. Todo estado vazio escrito com o componente <Vazio> precisa dizer o próximo passo: ou um
//      botão/link (`acao`), ou uma frase (`texto`). Só o título não basta.
//   2. Na tela do dia (Meu dia), que é a primeira que o advogado abre, cada cartão vazio aponta
//      para onde se resolve aquilo.

/** Fim da tag JSX a partir de `de`, contando < e > e respeitando o que está dentro de {}. */
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

const telas = readdirSync('src/pages').filter(f => f.endsWith('.tsx') && !f.includes('.test.'))

describe('tela vazia diz o que fazer primeiro', () => {
  it('todo <Vazio> traz o próximo passo: uma ação ou uma frase, nunca só o título', () => {
    const faltando: string[] = []
    for (const tela of telas) {
      const fonte = readFileSync(`src/pages/${tela}`, 'utf8')
      for (let i = fonte.indexOf('<Vazio'); i !== -1; i = fonte.indexOf('<Vazio', i + 1)) {
        const tag = fonte.slice(i, fimDaTag(fonte, i + 6))
        if (!/\bacao=/.test(tag) && !/\btexto=/.test(tag)) {
          const titulo = tag.match(/titulo=["{`]([^"`}]{0,60})/)?.[1] ?? tag.slice(0, 60)
          faltando.push(`${tela}: "${titulo}"`)
        }
      }
    }
    expect(faltando, `estado vazio sem próximo passo:\n${faltando.join('\n')}`).toEqual([])
  })

  it('também vale para os estados vazios dos componentes, não só das telas', () => {
    const comps = readdirSync('src/components').filter(f => f.endsWith('.tsx') && !f.includes('.test.'))
    const faltando: string[] = []
    for (const comp of comps) {
      const fonte = readFileSync(`src/components/${comp}`, 'utf8')
      for (let i = fonte.indexOf('<Vazio'); i !== -1; i = fonte.indexOf('<Vazio', i + 1)) {
        const tag = fonte.slice(i, fimDaTag(fonte, i + 6))
        if (!/\bacao=/.test(tag) && !/\btexto=/.test(tag)) faltando.push(`${comp}: ${tag.slice(0, 70)}`)
      }
    }
    expect(faltando, `estado vazio sem próximo passo:\n${faltando.join('\n')}`).toEqual([])
  })

  it('os cartões vazios de Meu dia apontam para onde se resolve aquilo', () => {
    const fonte = readFileSync('src/pages/MeuDiaPage.tsx', 'utf8')
    // "Nada vencendo" é a frase de quem ainda não trouxe os processos: tem de levar ao cadastro.
    const nada = fonte.slice(fonte.indexOf('Nada vencendo'), fonte.indexOf('Nada vencendo') + 600)
    expect(nada, 'o cartão "Nada vencendo" não diz por onde começar').toContain('/processos-antigos')
    // Contratos vencendo: leva a Imóveis, que é onde o contrato de locação vive.
    const contratos = fonte.slice(fonte.indexOf('Nenhum nos próximos 60 dias'), fonte.indexOf('Nenhum nos próximos 60 dias') + 400)
    expect(contratos, 'o cartão de contratos vazio não diz onde ficam os contratos').toContain('/imoveis')
    // Movimentações: explica quando enche, em vez de mandar a pessoa a outro lugar.
    expect(fonte).toContain('Casos com número CNJ são verificados no CNJ a cada 4 horas')
  })
})
