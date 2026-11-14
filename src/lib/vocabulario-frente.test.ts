// Erro #10 do planejamento: quatro nomes para a mesma coisa (frente, vertente, segmento, porta).
// O vocabulário que o usuário lê, em português, é UM só: "frente". Este teste trava isso — nenhum
// texto em português que aparece na tela pode dizer "vertente" ou "segmento".
//
// Vale só para os VALORES do dicionário (o que a pessoa lê). Os nomes de chave e de variável no
// código ("vertente.*", VERTENTES) seguem como estão: são internos, ninguém os vê.
import { describe, it, expect } from 'vitest'
import { DICIONARIOS } from '@/lib/i18n'

describe('um vocabulário só: "frente" (erro #10)', () => {
  it('nenhum texto em português na tela diz "vertente" ou "segmento"', () => {
    const ruins: string[] = []
    for (const [chave, valor] of Object.entries(DICIONARIOS.pt)) {
      if (typeof valor !== 'string') continue
      if (/\b(vertente|vertentes|segmento|segmentos)\b/i.test(valor)) {
        ruins.push(`${chave}: "${valor.slice(0, 60)}"`)
      }
    }
    expect(ruins, `Troque por "frente(s)":\n${ruins.join('\n')}`).toEqual([])
  })
})
