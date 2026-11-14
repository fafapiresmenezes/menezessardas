// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { lembrarUltimaFrente, ultimaFrente, esquecerUltimaFrente } from './destino'

// Motivo para voltar (passo V13): a última frente usada fica no aparelho, e só se for uma frente
// de verdade. Endereço estranho gravado à mão no navegador não vira destino.
beforeEach(() => localStorage.clear())

describe('a última frente usada', () => {
  it('é lembrada e devolvida', () => {
    lembrarUltimaFrente('/engenharia')
    expect(ultimaFrente()).toBe('/engenharia')
  })
  it('a tela de início não conta como frente a retomar', () => {
    lembrarUltimaFrente('/inicio')
    expect(ultimaFrente()).toBeNull()
  })
  it('endereço fora da lista não é gravado nem devolvido', () => {
    lembrarUltimaFrente('/settings')
    expect(ultimaFrente()).toBeNull()
    localStorage.setItem('theye-ultima-frente', 'https://exemplo.com')
    expect(ultimaFrente()).toBeNull()
  })
  it('some quando a pessoa prefere a tela de início', () => {
    lembrarUltimaFrente('/saude')
    esquecerUltimaFrente()
    expect(ultimaFrente()).toBeNull()
  })
})
