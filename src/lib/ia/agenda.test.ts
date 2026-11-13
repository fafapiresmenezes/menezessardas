// Passo D5: a agenda de pesquisa. O teste existe para uma coisa só — impedir que entre linha de
// pesquisa sem medida e sem o que a invalidaria, que é como agenda de IA vira propaganda.
import { describe, it, expect } from 'vitest'
import { LINHAS, NAO_AFIRMAMOS, POLITICA, SEMINARIO, emAndamento, proximoSeminario, semFalseador, semMedida } from './agenda'

describe('toda linha de pesquisa é falseável', () => {
  it('nenhuma linha fica sem o que a invalidaria', () => {
    expect(semFalseador()).toEqual([])
  })

  it('nenhuma linha fica sem como se mede', () => {
    expect(semMedida()).toEqual([])
  })

  it('a medida tem número ou período, e não adjetivo', () => {
    for (const l of LINHAS) expect(l.medida).toMatch(/\d/)
  })

  it('toda linha diz em que braço o resultado chega primeiro', () => {
    expect(LINHAS.every(l => l.chegaPrimeiroEm.length > 3)).toBe(true)
    expect(emAndamento().length).toBeGreaterThan(2)
  })
})

describe('o que não se afirma', () => {
  it('a primeira coisa dita é que a plataforma não é superinteligente nem consciente', () => {
    expect(NAO_AFIRMAMOS[0]).toMatch(/não é superinteligente/)
    expect(NAO_AFIRMAMOS.join(' ')).toMatch(/incerteza/)
  })

  it('a política proíbe análise de rosto e emoção e exige revisão humana antes de escrever em produção', () => {
    const t = POLITICA.map(p => p.regra).join(' ')
    expect(t).toMatch(/rosto, emoção, mentira ou perfil psicológico/)
    expect(t).toMatch(/revisão humana/)
    expect(t).toMatch(/contraria o interesse comercial/)
  })
})

describe('seminário trimestral', () => {
  it('são quatro por ano, em ordem, e a pauta exige dizer que hipótese caiu', () => {
    expect(SEMINARIO.proximos).toHaveLength(4)
    expect([...SEMINARIO.proximos]).toEqual([...SEMINARIO.proximos].sort())
    expect(SEMINARIO.pautaMinima.join(' ')).toMatch(/hipótese foi abandonada/)
  })

  it('o próximo seminário é o primeiro que ainda não passou', () => {
    expect(proximoSeminario('2027-01-01')).toBe('2027-02-15')
    expect(proximoSeminario('2027-02-15')).toBe('2027-02-15')
    expect(proximoSeminario('2027-06-01')).toBe('2027-08-16')
    expect(proximoSeminario('2028-01-01')).toBeNull()
  })
})
