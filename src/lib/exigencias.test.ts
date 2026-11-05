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

import { textoChanceClasse } from './previsaoInstituto'
describe('chance por classe do Instituto', () => {
  it('formata percentual, margem e amostra', () => {
    expect(textoChanceClasse({ classe: 'Despejo', n: 1234, p: 0.873, ic95: [0.85, 0.892] })).toBe('Despejo: 87% (margem de 95%: 85–89%, n = 1.234)')
  })
})

import { prazosFaltantes } from './exigencias'
describe('prazos dos documentos faltantes', () => {
  it('um prazo por documento faltante, 30 dias depois, citando a norma', () => {
    const p = prazosFaltantes('residencial', ['matricula certidao.pdf'], { id: 'i1', nome: 'Rua A, Rio' }, new Date('2026-11-05T12:00:00Z'))
    expect(p.length).toBeGreaterThan(0)
    expect(p[0]!.dataEvento).toBe('2026-12-05')
    expect(p.every(x => /\(.+\)$/.test(x.titulo) && x.imovelId === 'i1')).toBe(true)
    expect(p.some(x => x.titulo.includes('Matrícula'))).toBe(false)
  })
})
