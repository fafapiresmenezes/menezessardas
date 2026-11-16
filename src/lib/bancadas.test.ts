import { describe, it, expect } from 'vitest'
import {
  AREAS_BANCADAS,
  DESCRICOES_BANCADAS,
  STATUS_BANCADAS,
  emailBancadasTemplate,
  emailEmpresasIATemplate
} from './bancadas'

describe('bancadas.ts', () => {
  it('deve ter todas as 7 áreas de bancadas', () => {
    expect(AREAS_BANCADAS).toHaveLength(7)
    expect(AREAS_BANCADAS).toContain('direito')
    expect(AREAS_BANCADAS).toContain('cyber')
    expect(AREAS_BANCADAS).toContain('quantum')
  })

  it('deve ter descrição para cada área', () => {
    AREAS_BANCADAS.forEach(area => {
      expect(DESCRICOES_BANCADAS[area]).toBeDefined()
      expect(DESCRICOES_BANCADAS[area].titulo).toBeTruthy()
      expect(DESCRICOES_BANCADAS[area].descricao).toBeTruthy()
      expect(DESCRICOES_BANCADAS[area].status).toBeTruthy()
    })
  })

  it('deve ter status válidos', () => {
    expect(STATUS_BANCADAS.preparacao).toBe('Preparação')
    expect(STATUS_BANCADAS.aceitando).toBe('Aceitando Inscrições')
    expect(STATUS_BANCADAS.operacao).toBe('Em Operação')
  })

  it('template de bancadas deve conter informações-chave', () => {
    expect(emailBancadasTemplate).toContain('BANCADAS E NÚCLEOS COLABORATIVOS')
    expect(emailBancadasTemplate).toContain('bancadas@theye.club')
    expect(emailBancadasTemplate).toContain('smart contract')
  })

  it('template de IA deve conter nome da empresa', () => {
    const template = emailEmpresasIATemplate('Test Company')
    expect(template).toContain('Test Company')
    expect(template).toContain('Cybersecurity')
    expect(template).toContain('34.028.316/0001-14')
  })

  it('áreas devem ter status válidos', () => {
    AREAS_BANCADAS.forEach(area => {
      const status = DESCRICOES_BANCADAS[area].status
      expect(['preparacao', 'aceitando', 'operacao']).toContain(status)
    })
  })
})
