// Passo 422: cartão "Probabilidade do THEYE Institute" — formatação em linguagem simples.
import { describe, it, expect } from 'vitest'
import { pct, resumirPrevisaoInstituto, CLASSES_LOCACAO } from './previsaoInstituto'

describe('previsão do Instituto', () => {
  it('pct formata com vírgula e uma casa', () => {
    expect(pct(0.6234)).toBe('62,3%')
    expect(pct(1)).toBe('100,0%')
  })
  it('resume título, margem, modelo por grafo e confiança traduzida', () => {
    const r = resumirPrevisaoInstituto({ convencional: { p: 0.62, ic95: [0.55, 0.69], n: 1234 }, grafo: { p: 0.6 }, confianca: 'media', placar_atual: '0,1266 vs 0,1270', aviso: '', fonte: 'CNJ' })
    expect(r.titulo).toBe('62,0% de procedência')
    expect(r.detalhe).toBe('Margem (95%): entre 55,0% e 69,0% · 1.234 processos')
    expect(r.grafo).toBe('Modelo por grafo: 60,0% (placar 0,1266 vs 0,1270)')
    expect(r.confianca).toBe('média')
  })
  it('sem grafo devolve null e confiança desconhecida passa como texto', () => {
    const r = resumirPrevisaoInstituto({ convencional: { p: 0.5, ic95: [0.4, 0.6], n: 10 }, grafo: null, confianca: 'inconclusiva', placar_atual: '', aviso: '', fonte: '' })
    expect(r.grafo).toBeNull()
    expect(r.confianca).toBe('inconclusiva')
    expect(CLASSES_LOCACAO).toContain('Renovatória de Locação')
  })
})
