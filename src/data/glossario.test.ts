import { describe, it, expect } from 'vitest'
import { GLOSSARIO, marcarTermos, definicao } from './glossario'
describe('glossário', () => {
  it('tem 80 termos', () => expect(Object.keys(GLOSSARIO).length).toBe(80))
  it('marca termos inteiros, uma vez, sem quebrar palavras', () => {
    const p = marcarTermos('Protocolar a Contestação e a contestação; prazos do locatário')
    expect(p.filter(x => x.termo).map(x => x.t)).toEqual(['Contestação', 'locatário'])
    expect(p.map(x => x.t).join('')).toBe('Protocolar a Contestação e a contestação; prazos do locatário')
  })
  it('acha definição sem diferenciar maiúsculas', () => expect(definicao('igp-m')).toBeTruthy())
})
