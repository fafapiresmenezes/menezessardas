import { describe, it, expect } from 'vitest'
import { veTudo, podeVer, filtrarPorHierarquia, rotuloCargo, CARGOS } from './hierarquia'

describe('Hierarquia do escritório (sócio, gestor, pleno, júnior)', () => {
  it('sócio e gestor veem tudo; pleno e júnior não', () => {
    expect(veTudo('socio')).toBe(true)
    expect(veTudo('gestor')).toBe(true)
    expect(veTudo('pleno')).toBe(false)
    expect(veTudo('junior')).toBe(false)
    expect(veTudo(null)).toBe(false)
  })

  it('cada um é dono dos seus processos: pleno vê os seus e os sem dono, nunca os dos colegas', () => {
    const eu = { id: 'u1', cargo: 'pleno' as const }
    expect(podeVer(eu, 'u1')).toBe(true)
    expect(podeVer(eu, null)).toBe(true)
    expect(podeVer(eu, 'u2')).toBe(false)
  })

  it('quem é acima vê tudo: gestor e admin veem o processo de qualquer colega', () => {
    expect(podeVer({ id: 'g', cargo: 'gestor' }, 'u2')).toBe(true)
    expect(podeVer({ id: 'a', cargo: null, admin: true }, 'u2')).toBe(true)
  })

  it('filtrarPorHierarquia corta a lista para quem não vê tudo', () => {
    const itens = [{ responsavel_id: 'u1' }, { responsavel_id: 'u2' }, { responsavel_id: null }]
    expect(filtrarPorHierarquia(itens, { id: 'u1', cargo: 'junior' })).toHaveLength(2)
    expect(filtrarPorHierarquia(itens, { id: 'u1', cargo: 'socio' })).toHaveLength(3)
  })

  it('todo cargo tem rótulo em português para a tela', () => {
    for (const c of CARGOS) expect(rotuloCargo[c].length).toBeGreaterThan(2)
  })
})
