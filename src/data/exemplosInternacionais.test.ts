// Prova dos exemplos reais citados (pedido de M, 18/11/2026): cada exemplo tem fonte https,
// país da casa (AO/NA), valor publicado com ano e nenhuma palavra de previsão.
import { describe, it, expect } from 'vitest'
import { EXEMPLOS_INTERNACIONAIS, REPOSITORIOS_FUNDOS } from './exemplosInternacionais'

describe('exemplos internacionais citados', () => {
  it('todo exemplo tem fonte https, país AO/NA e valor publicado com ano', () => {
    expect(EXEMPLOS_INTERNACIONAIS.length).toBeGreaterThanOrEqual(3)
    for (const e of EXEMPLOS_INTERNACIONAIS) {
      expect(e.fonte.url, e.id).toMatch(/^https:\/\//)
      expect(['AO', 'NA']).toContain(e.pais)
      expect(e.valorPublicado, e.id).toMatch(/\(.*20\d\d\)/)
    }
  })

  it('nenhum exemplo promete previsão nem usa a marca do cliente', () => {
    const t = JSON.stringify(EXEMPLOS_INTERNACIONAIS).toLowerCase()
    for (const proibida of ['previs', 'predi', 'imbono', 'gemcorp']) expect(t).not.toContain(proibida)
  })

  it('os repositórios têm endereço https e explicação', () => {
    for (const r of REPOSITORIOS_FUNDOS) {
      expect(r.url).toMatch(/^https:\/\//)
      expect(r.oQueDa.length).toBeGreaterThan(10)
    }
  })
})
