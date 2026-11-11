import { describe, expect, it } from 'vitest'
import { pct, resumirPrevisaoInstituto } from '@/lib/previsaoInstituto'

describe('previsão do THEYE Institute (U13)', () => {
  it('formata percentuais em português', () => {
    expect(pct(0.974)).toBe('97,4%')
    expect(pct(0)).toBe('0,0%')
  })
  it('resume a resposta da API em linguagem simples', () => {
    const r = resumirPrevisaoInstituto({ convencional: { p: 0.974, ic95: [0.958, 0.986], n: 490 }, grafo: { p: 0.97 }, confianca: 'alta', placar_atual: 'inconclusivo', aviso: 'Não é garantia.', fonte: 'THEYE Institute' })
    expect(r.titulo).toBe('97,4% de procedência')
    expect(r.detalhe).toBe('Margem (95%): entre 95,8% e 98,6% · 490 processos')
    expect(r.grafo).toBe('Modelo por grafo: 97,0% (placar inconclusivo)')
    expect(r.confianca).toBe('alta')
  })
  it('omite o grafo quando a API não o devolve', () => {
    const r = resumirPrevisaoInstituto({ convencional: { p: 0.5, ic95: [0.4, 0.6], n: 10 }, grafo: null, confianca: 'baixa', placar_atual: '', aviso: '', fonte: '' })
    expect(r.grafo).toBeNull(); expect(r.confianca).toBe('baixa')
  })
})
