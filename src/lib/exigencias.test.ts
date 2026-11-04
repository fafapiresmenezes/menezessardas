import { describe, it, expect } from 'vitest'
import { FUNCOES, funcaoDoImovel, presente, checklistDaFuncao } from './exigencias'

describe('exigências por função (ontologia v0.8)', () => {
  it('tem 5 funções com documentos, norma e link', () => {
    expect(FUNCOES.map(f => f.id)).toEqual(['residencial', 'comercial', 'galpao', 'rural', 'temporada'])
    for (const f of FUNCOES) for (const d of f.documentos) { expect(d.norma).toBeTruthy(); expect(d.url).toMatch(/^https:/) }
  })
  it('deriva a função pelo contrato e pelo tipo', () => {
    expect(funcaoDoImovel('apartamento')).toBe('residencial')
    expect(funcaoDoImovel('apartamento', 'locacao_temporada')).toBe('temporada')
    expect(funcaoDoImovel('loja')).toBe('comercial')
    expect(funcaoDoImovel('galpao', 'locacao_comercial')).toBe('galpao')
    expect(funcaoDoImovel('terreno', 'arrendamento')).toBe('rural')
  })
  it('marca presente pelo nome do anexo, sem acento e sem caixa', () => {
    expect(presente('Matrícula atualizada com certidão de ônus', ['MATRICULA 12345 - certidao.pdf'])).toBe(true)
    expect(presente('Matrícula atualizada com certidão de ônus', ['IPTU 2026.pdf'])).toBe(false)
    const c = checklistDaFuncao('residencial', ['matricula certidao.pdf'])
    expect(c.itens.filter(i => i.ok).length).toBeGreaterThanOrEqual(1)
    expect(c.itens.some(i => !i.ok)).toBe(true)
  })
})
