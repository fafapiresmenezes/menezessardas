// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { corpoCanonico, conferirCorrente, lerElos, anteriorDe, recalcular, GENESE } from './trilho'

// Passo T2: a conferência da corrente roda no navegador, e quem confere não pode depender de mim.
// Este teste roda contra o arquivo DE VERDADE que vai publicado em public/trilho-v4.jsonl.

const elos = lerElos(readFileSync('public/trilho-v4.jsonl', 'utf8'))

describe('corpo canônico (a forma que o Python escreve)', () => {
  it('põe um espaço depois dos dois-pontos e da vírgula, e ordena as chaves', () => {
    expect(corpoCanonico({ b: 1, a: 2 })).toBe('{"a": 2, "b": 1}')
    expect(corpoCanonico({ x: [1, 2] })).toBe('{"x": [1, 2]}')
    // É aqui que o JSON.stringify do JavaScript erra: ele escreve {"a":2,"b":1} e muda o hash.
    expect(corpoCanonico({ b: 1, a: 2 })).not.toBe(JSON.stringify({ a: 2, b: 1 }))
  })

  it('escreve acento cru, como ensure_ascii=False', () => {
    expect(corpoCanonico({ p: 'ação' })).toBe('{"p": "ação"}')
  })

  it('ordena por chave em qualquer profundidade', () => {
    expect(corpoCanonico({ z: { d: 1, c: 2 } })).toBe('{"z": {"c": 2, "d": 1}}')
  })
})

describe('a corrente do trilho publicada', () => {
  it('tem elos e o primeiro aponta para a gênese do plano v4', () => {
    expect(elos.length).toBeGreaterThan(30)
    expect(anteriorDe(elos[0])).toBe(GENESE)
  })

  it('a ligação está íntegra de ponta a ponta', async () => {
    const c = await conferirCorrente(elos)
    const soltos = c.elos.filter(e => !e.ligado).map(e => `${e.n} (${e.passo})`)
    expect(soltos, `elo solto na corrente: ${soltos.join(', ')}`).toEqual([])
    expect(c.ligacaoIntegra).toBe(true)
  })

  it('reproduz todo elo escrito a partir de 13/11/2026, e diz quais não reproduz', async () => {
    const c = await conferirCorrente(elos)
    // Os três de receita antiga são conhecidos e estão nomeados na tela, não escondidos.
    const antigos = c.elos.filter(e => !e.reproduzido).map(e => e.passo)
    expect(antigos.length, `receita antiga em: ${antigos.join(', ')}`).toBeLessThanOrEqual(3)
    expect(c.reproduzidos).toBe(elos.length - antigos.length)
    // Nenhum elo novo pode entrar na lista de não reproduzidos: a receita de hoje é única.
    for (const p of antigos) expect(['EMISSAO', 'ROTEAMENTO', 'A26']).toContain(p)
  })

  it('mudar uma letra de um elo faz o hash dele deixar de bater', async () => {
    const alvo = { ...elos[elos.length - 1] }
    expect(await recalcular(alvo)).toBe(alvo.hash)
    const mexido = { ...alvo, passo: `${alvo.passo} ` }
    expect(await recalcular(mexido)).not.toBe(alvo.hash)
  })
})
