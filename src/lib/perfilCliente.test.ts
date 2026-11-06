import { describe, it, expect } from 'vitest'
import { PERGUNTAS, avaliarPerfil } from './perfilCliente'

describe('perfil de atendimento do cliente (B02)', () => {
  it('tem 12 perguntas, ids únicos e nenhuma pergunta sensível', () => {
    expect(PERGUNTAS.length).toBe(12)
    expect(new Set(PERGUNTAS.map(p => p.id)).size).toBe(12)
    const texto = PERGUNTAS.map(p => p.texto + p.opcoes.map(o => o.rotulo).join(' ')).join(' ').toLowerCase()
    for (const proibido of ['saúde', 'religi', 'polític', 'raça', 'cor da pele', 'sexual', 'sindica', 'rosto', 'câmera', 'biometr']) expect(texto).not.toContain(proibido)
  })
  it('sem respostas não gera nada', () => {
    expect(avaliarPerfil({})).toEqual({ completo: false, respondidas: 0, resumo: [], sugestoes: [] })
  })
  it('cliente avesso a risco, urgente e que quer acordo recebe sugestões coerentes', () => {
    const r = avaliarPerfil({ q1: 'whatsapp', q12: 'manha', q3: 'resumo', q4: 'resumo', q5: 'alta', q6: 'baixo', q7: 'baixo', q8: 'acordo', q9: 'acordo', q10: 'alto', q11: 'previsivel', q2: 'semanal' })
    expect(r.completo).toBe(true)
    expect(r.resumo).toContain('Tolerância a risco: baixa (declarada pelo cliente).')
    expect(r.sugestoes).toContain('Use linguagem simples e mensagens curtas, sem jargão.')
    expect(r.sugestoes).toContain('Considere mediação ou conciliação logo no início.')
    expect(r.sugestoes.some(s => s.includes('tutela de urgência'))).toBe(true)
    expect(r.sugestoes[0]).toBe('Mande as atualizações por whatsapp (manhã).')
  })
  it('cliente que quer decisão judicial e detalhe completo', () => {
    const r = avaliarPerfil({ q3: 'completo', q4: 'completo', q6: 'alto', q7: 'alto', q8: 'decisao', q9: 'decisao' })
    expect(r.sugestoes).toContain('Envie fundamentos e cópia das peças e decisões.')
    expect(r.sugestoes).not.toContain('Considere mediação ou conciliação logo no início.')
    expect(r.resumo).toContain('Tolerância a risco: alta (declarada pelo cliente).')
  })
})
