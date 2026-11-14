// Erro do planejamento (capítulo 10): 4 fichas citavam norma revogada ou mal citada, o que desmente
// a frase "só afirmamos o que conseguimos provar". Normas conferidas em 14/11/2026:
//  - CNJ 332/2020 foi substituída pela Resolução CNJ 615/2025 (não citar 332 como vigente isolada).
//  - Decreto 10.222/2020 (E-Ciber) foi revogado pelo Decreto 12.573/2025 (não citar 10.222 como vigente).
//  - Lei 14.689/2023 é federal e trata de voto de qualidade no CARF, não de arbitragem por lei estadual.
// Este teste trava a volta dessas citações erradas nos textos das fichas.
import { describe, it, expect } from 'vitest'
import { PRODUTOS } from '@/data/produtos'

const CORPO = (p: (typeof PRODUTOS)[number]) =>
  `${p.titulo} ${p.oQueE}`

describe('normas vigentes no caderno de produtos', () => {
  it('nenhuma ficha cita a Resolução CNJ 332/2020 como norma vigente isolada', () => {
    const ruins = PRODUTOS.filter(p => /\b332\/2020\b/.test(CORPO(p)) && !/615\/2025/.test(CORPO(p)))
      .map(p => `#${p.numero}`)
    expect(ruins, `332/2020 foi substituída pela 615/2025: ${ruins.join(', ')}`).toEqual([])
  })

  it('nenhuma ficha cita o Decreto 10.222/2020 como norma vigente isolada', () => {
    const ruins = PRODUTOS.filter(p => /\b10\.222\/2020\b/.test(CORPO(p)) && !/12\.573\/2025/.test(CORPO(p)))
      .map(p => `#${p.numero}`)
    expect(ruins, `10.222/2020 foi revogado pelo 12.573/2025: ${ruins.join(', ')}`).toEqual([])
  })

  it('nenhuma ficha chama a Lei 14.689/2023 de "lei estadual" de arbitragem', () => {
    const ruins = PRODUTOS.filter(p => /14\.689\/2023/.test(CORPO(p)) && /estadual/i.test(CORPO(p)))
      .map(p => `#${p.numero}`)
    expect(ruins, `14.689/2023 é federal (voto de qualidade no CARF): ${ruins.join(', ')}`).toEqual([])
  })
})
