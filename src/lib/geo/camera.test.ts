// Provas da leitura de cena (elo R5). A regra é transparente de propósito: dá para conferir
// à mão por que a câmera disse "Rua" — não é caixa-preta.
// Regra permanente de M: a câmera CONTA pessoas, nunca identifica ninguém.
import { describe, it, expect } from 'vitest'
import { classificarAmbiente } from './camera'

const d = (classe: string, confianca = 0.9) => ({ classe, confianca })

describe('Leitura de cena pela câmera', () => {
  it('reconhece a rua pelos sinais de rua', () => {
    const r = classificarAmbiente([d('car'), d('traffic light'), d('bus')])
    expect(r.ambiente).toBe('Rua')
    expect(r.confianca).toBeGreaterThan(0.8)
  })

  it('conta pessoas sem identificar ninguém', () => {
    const r = classificarAmbiente([d('person'), d('person'), d('bed')])
    expect(r.pessoas).toBe(2)
    expect(r.ambiente).toBe('Casa (quarto)')
    // "pessoa" nunca entra na lista de objetos de referência do lugar
    expect(r.objetos).not.toContain('pessoa')
  })

  it('não afirma lugar quando não há sinal nenhum', () => {
    const r = classificarAmbiente([d('teddy bear')])
    expect(r.ambiente).toBe('Indefinido')
    expect(r.confianca).toBe(0)
  })

  it('ignora detecção fraca abaixo do mínimo', () => {
    const r = classificarAmbiente([d('car', 0.2), d('traffic light', 0.1)])
    expect(r.ambiente).toBe('Indefinido')
  })

  it('a confiança cai quando dois ambientes empatam', () => {
    // 'sink' sustenta Cozinha e Banheiro ao mesmo tempo: empate, confiança baixa
    const empate = classificarAmbiente([d('sink')])
    const limpo = classificarAmbiente([d('refrigerator'), d('oven'), d('microwave')])
    expect(empate.confianca).toBeLessThan(limpo.confianca)
  })

  it('reconhece os ambientes novos', () => {
    expect(classificarAmbiente([d('pizza'), d('wine glass'), d('fork')]).ambiente).toBe('Refeição')
    expect(classificarAmbiente([d('horse'), d('sheep'), d('cow')]).ambiente).toBe('Natureza / área aberta')
    expect(classificarAmbiente([d('sports ball'), d('tennis racket')]).ambiente).toBe('Esporte / lazer')
  })
})
