import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { INVENTARIO, NORMAS_NIST, ANO_LIMITE_NIST, mosca, anosAteOMarco, precisaDeTrabalho } from './posQuantico'

/**
 * O que estes testes prendem: que o inventário não tem item sem explicação, que as normas do NIST
 * estão com número e data certos, e que o relatório cita a fonte de cada número. Também prendem a
 * conclusão que mais se perde quando alguém resume o assunto de memória: a corrente de hash NÃO é o
 * ponto fraco; a assinatura eletrônica é.
 * O que eles NÃO conferem: se o NIST publicou algo novo depois de 13/11/2026. Para isso o
 * relatório carrega a data da consulta.
 */
const DOC = readFileSync('quantico/D4-pos-quantico.md', 'utf8')

describe('inventário pós-quântico', () => {
  it('todo item diz algoritmo, tamanho, por quê e o que fazer', () => {
    expect(INVENTARIO.length).toBeGreaterThanOrEqual(6)
    for (const i of INVENTARIO) {
      expect(i.algoritmo.length).toBeGreaterThan(3)
      expect(i.bits).toBeGreaterThanOrEqual(128)
      expect(i.por_que.length).toBeGreaterThan(40)
      expect(i.o_que_fazer.length).toBeGreaterThan(5)
      expect(['baixa', 'media', 'alta']).toContain(i.exposicao)
    }
  })

  it('o ponto fraco é a assinatura eletrônica, não a corrente de hash', () => {
    const ids = precisaDeTrabalho().map(i => i.id)
    expect(ids).toContain('assinatura')
    expect(ids).not.toContain('corrente')
    expect(ids).not.toContain('selo')
  })

  it('as três normas finais do NIST, com número e data', () => {
    expect(NORMAS_NIST.map(n => n.fips)).toEqual(['203', '204', '205'])
    expect(NORMAS_NIST.map(n => n.algoritmo)).toEqual(['ML-KEM', 'ML-DSA', 'SLH-DSA'])
    for (const n of NORMAS_NIST) expect(n.desde).toBe('2024-08-13')
    expect(ANO_LIMITE_NIST).toBe(2035)
  })

  it('a conta de Mosca acusa risco quando sigilo mais migração passam do prazo', () => {
    expect(mosca(10, 2, 9)).toEqual({ risco: true, folga: -3 })
    expect(mosca(3, 1, 9)).toEqual({ risco: false, folga: 5 })
    expect(anosAteOMarco(new Date('2026-06-01T00:00:00Z'))).toBe(9)
  })

  it('o relatório cita a fonte e a data de cada número, e não promete o que não dá', () => {
    expect(DOC).toMatch(/csrc\.nist\.gov\/projects\/post-quantum-cryptography/)
    expect(DOC).toMatch(/13\/08\/2024/)
    expect(DOC).toMatch(/11\/03\/2025/)
    // Falcon e HQC não têm data final; o relatório tem de dizer isso em vez de inventar.
    expect(DOC).toMatch(/publica número de FIPS nem data/)
    expect(DOC).toMatch(/aproximadamente dois anos/)
    // O erro comum, corrigido no texto.
    expect(DOC).toMatch(/HQC não é o "quinto algoritmo"/)
    // E a frase que impede vender fumaça.
    expect(DOC).toMatch(/seria vender fumaça/)
  })
})
