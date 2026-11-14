// Erro #7 do planejamento: a mesma frente tinha dois estados — Educação aparecia "No ar" na porta
// e "Em estudo" na página. Uma frente, um estado. Este teste trava isso: para toda frente que tem
// página de apresentação (portal), o estado mostrado na porta tem de ser o mesmo da página.
import { describe, it, expect } from 'vitest'
import { VERTENTES, type EstadoVertente } from '@/data/vertentes'
import { PORTAIS_INSTITUTO, type EstadoPortal } from '@/data/portais-instituto'

// Como o vocabulário da porta (no-ar/em-teste/em-desenvolvimento/em-estudo) e o do portal
// (estudo/prototipo/piloto) ainda são dois, a correspondência fica explícita aqui.
const PORTAL_PARA_VERTENTE: Record<EstadoPortal, EstadoVertente> = {
  estudo: 'em-estudo',
  prototipo: 'em-desenvolvimento',
  piloto: 'em-teste',
}

describe('uma frente, um estado (erro #7)', () => {
  it('toda frente com portal mostra o mesmo estado na porta e na página', () => {
    for (const p of PORTAIS_INSTITUTO) {
      const v = VERTENTES.find(x => x.rota === p.rota)
      if (!v) continue // nem todo portal está na grade da porta
      expect(v.estado, `frente ${p.rota}: porta diz "${v.estado}", página diz "${p.estado}"`)
        .toBe(PORTAL_PARA_VERTENTE[p.estado])
    }
  })

  it('a Educação não está mais "no ar" (o caso que o planejamento apontou)', () => {
    const educacao = VERTENTES.find(v => v.id === 'educacao')
    expect(educacao?.estado).toBe('em-estudo')
  })
})
