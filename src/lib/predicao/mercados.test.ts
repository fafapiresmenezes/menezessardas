import { describe, it, expect } from 'vitest'
import {
  CANDIDATOS,
  CRITERIOS,
  DECIDIDO_EM,
  ESCOLHA_PENDENTE,
  NAO_E_RECOMENDACAO,
  NOTA_MAXIMA,
  PESO_TOTAL,
  finalistas,
  pontuar,
  ranking,
} from './mercados'

/**
 * O que estes testes prendem: que todo candidato diz quem paga, de onde vem o dado E o que o
 * derruba; que a nota é uma conta dos critérios e não um número escrito à mão; e que os finalistas
 * saem do ranking. O teste `mudar uma nota muda o finalista` existe porque uma matriz cuja ordem
 * não responde às notas é enfeite em volta de uma escolha já tomada.
 */

describe('matriz de escolha do mercado', () => {
  it('são pelo menos 10 candidatos, como o passo pede, e sem id repetido', () => {
    expect(CANDIDATOS.length).toBeGreaterThanOrEqual(10)
    expect(new Set(CANDIDATOS.map(c => c.id)).size).toBe(CANDIDATOS.length)
  })

  it('todo candidato nomeia quem paga, a fonte com endereço e o que o derruba', () => {
    for (const c of CANDIDATOS) {
      expect(c.quemPaga.length, c.nome).toBeGreaterThan(15)
      expect(c.fonte.length, c.nome).toBeGreaterThan(5)
      expect(c.fonteEndereco, c.nome).toMatch(/^https:\/\//)
      expect(c.porque.length, c.nome).toBeGreaterThan(60)
      expect(c.contra.length, c.nome).toBeGreaterThan(60)
    }
  })

  it('toda nota é de 0 a 3 e todo critério está preenchido', () => {
    for (const c of CANDIDATOS) {
      for (const crit of CRITERIOS) {
        const n = c.notas[crit.id]
        expect(n, `${c.nome}/${crit.id}`).toBeGreaterThanOrEqual(0)
        expect(n, `${c.nome}/${crit.id}`).toBeLessThanOrEqual(3)
      }
    }
  })

  it('todo critério tem peso e régua dizendo o que vale 3 e o que vale 0', () => {
    for (const crit of CRITERIOS) {
      expect(crit.peso).toBeGreaterThan(0)
      expect(crit.regua).toContain('3 =')
      expect(crit.regua).toContain('0 =')
    }
    expect(PESO_TOTAL).toBe(15)
    expect(NOTA_MAXIMA).toBe(45)
  })

  it('a nota é a soma dos critérios vezes o peso, conferível à mão', () => {
    const etanol = pontuar(CANDIDATOS.find(c => c.id === 'etanol-praca')!)
    expect(etanol.nota).toBe(NOTA_MAXIMA)
    const soja = pontuar(CANDIDATOS.find(c => c.id === 'soja')!)
    // 3*3 + 3*2 + 0*3 + 3*3 + 1*2 + 3*2 = 9 + 6 + 0 + 9 + 2 + 6
    expect(soja.nota).toBe(32)
    expect(soja.porCriterio.poucoRobo).toBe(0)
  })

  it('o ranking vem do melhor para o pior, e os finalistas são os três primeiros', () => {
    const r = ranking()
    for (let i = 1; i < r.length; i++) expect(r[i - 1].nota).toBeGreaterThanOrEqual(r[i].nota)
    expect(finalistas().map(c => c.id)).toEqual(r.slice(0, 3).map(c => c.id))
  })

  it('mudar uma nota muda o finalista: a matriz manda, não a opinião', () => {
    const inventado = {
      ...CANDIDATOS[0],
      id: 'inventado',
      nome: 'Aaa mercado inventado',
      notas: Object.fromEntries(CRITERIOS.map(c => [c.id, 3])),
    }
    const comEle = finalistas([...CANDIDATOS, inventado])
    expect(comEle.map(c => c.id)).toContain('inventado')
    const rebaixado = { ...inventado, notas: Object.fromEntries(CRITERIOS.map(c => [c.id, 0])) }
    expect(finalistas([...CANDIDATOS, rebaixado]).map(c => c.id)).not.toContain('inventado')
  })

  it('o carbono regulado pontua zero em dado e atualização, porque ainda não há preço negociado', () => {
    const c = CANDIDATOS.find(x => x.id === 'carbono-regulado')!
    expect(c.notas.dadoPublico).toBe(0)
    expect(c.notas.atualizacao).toBe(0)
    expect(c.contra).toContain('ainda não há negociação')
  })

  it('a tela não pode dizer que a escolha foi feita, porque ela é de M', () => {
    expect(DECIDIDO_EM).toBeNull()
    expect(ESCOLHA_PENDENTE).toContain('proposta')
    expect(ESCOLHA_PENDENTE).toContain('toque dele')
  })

  it('o aviso de que isto não é recomendação de investimento está na primeira linha', () => {
    expect(NAO_E_RECOMENDACAO[0]).toContain('não é recomendação de investimento')
    expect(NAO_E_RECOMENDACAO.join(' ')).toContain('não compra nem vende')
  })
})
