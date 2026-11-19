// Erro #7 do planejamento: a mesma frente tinha dois estados e a porta prometia mais do que a
// página entregava. Em 19/11/2026 M decidiu: TODAS as frentes ficam acessíveis na porta ("no ar",
// cada uma abrindo com senha), para ele testar tudo. A honestidade muda de lugar, não some: a
// página de cada frente continua dizendo a maturidade real (estudo, protótipo ou piloto) no campo
// "como está". Este teste trava as duas coisas.
import { describe, it, expect } from 'vitest'
import { VERTENTES } from '@/data/vertentes'
import { PORTAIS_INSTITUTO } from '@/data/portais-instituto'

describe('uma frente, um estado (erro #7, regra de 19/11/2026)', () => {
  it('a porta deixa todas as frentes acessíveis, com senha', () => {
    for (const v of VERTENTES) expect(v.estado, v.id).toBe('no-ar')
  })

  it('a página de cada frente continua dizendo a maturidade real, sem promessa vazia', () => {
    for (const p of PORTAIS_INSTITUTO) {
      expect(['estudo', 'prototipo', 'piloto'], p.rota).toContain(p.estado)
      expect(p.comoEsta.length, p.rota).toBeGreaterThan(40)
    }
  })

  it('a Educação segue honesta na página: em estudo', () => {
    expect(PORTAIS_INSTITUTO.find(p => p.rota === '/educacao')?.estado).toBe('estudo')
  })
})
