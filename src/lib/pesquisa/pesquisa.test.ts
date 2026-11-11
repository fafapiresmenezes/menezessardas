import { describe, it, expect } from 'vitest'
import { detectar, acoesPara, DILIGENCIAS, COBERTURA, textoDiligencia } from './pesquisa'
import { cnj } from '@/test/cnj'

describe('detectar o que foi digitado', () => {
  it('número CNJ válido, com o tribunal', () => {
    const n = cnj(1234567, 2023, '8', '19', '0001')
    const d = detectar(n)
    expect(d.tipo).toBe('cnj'); expect(d.valido).toBe(true); expect(d.detalhe).toMatch(/TJRJ|Tribunal de Justiça/)
  })
  it('número CNJ com dígito errado é reconhecido mas avisa', () => {
    const d = detectar('1234567-00.2023.8.19.0001')
    expect(d.tipo).toBe('cnj'); expect(d.valido).toBe(false); expect(d.aviso).toMatch(/Dígito/)
  })
  it('CNJ só com dígitos também é reconhecido', () => {
    const n = cnj(7654321).replace(/\D/g, '')
    expect(detectar(n).tipo).toBe('cnj')
  })
  it('CPF e CNPJ válidos e inválidos', () => {
    expect(detectar('529.982.247-25')).toMatchObject({ tipo: 'cpf', valido: true })
    expect(detectar('111.111.111-11')).toMatchObject({ tipo: 'cpf', valido: false })
    expect(detectar('11.222.333/0001-81')).toMatchObject({ tipo: 'cnpj', valido: true })
    expect(detectar('11.222.333/0001-80')).toMatchObject({ tipo: 'cnpj', valido: false })
  })
  it('OAB com ou sem pontos e em minúsculas', () => {
    expect(detectar('123456/rj')).toMatchObject({ tipo: 'oab', formatado: '123456/RJ' })
    expect(detectar('98.765 / SP')).toMatchObject({ tipo: 'oab', formatado: '98765/SP' })
  })
  it('nome, vazio e nome curto demais', () => {
    expect(detectar('Maria da Silva Ltda')).toMatchObject({ tipo: 'nome', valido: true })
    expect(detectar('   ').tipo).toBe('vazio')
    expect(detectar('ab')).toMatchObject({ tipo: 'nome', valido: false })
  })
})

describe('ações por tipo de busca', () => {
  it('processo: linha do tempo com o número, prazos, intimações e sites externos', () => {
    const n = cnj(1234567)
    const a = acoesPara(detectar(n))
    expect(a.find(x => x.id === 'linha')?.href).toBe(`/monitoramento?lt=${encodeURIComponent(n)}`)
    expect(a.some(x => x.href === '/prazos')).toBe(true)
    expect(a.filter(x => x.externo).map(x => x.id)).toEqual(['escavador', 'jusbrasil'])
  })
  it('CNPJ: checagem de contraparte e ficha preenchidas', () => {
    const a = acoesPara(detectar('11.222.333/0001-81'))
    expect(a.find(x => x.id === 'kyc')?.href).toContain('/kyc?doc=11.222.333%2F0001-81')
    expect(a.find(x => x.id === 'parte')?.href).toContain('cnpj=')
  })
  it('OAB leva à importação e às intimações; vazio não traz nada', () => {
    expect(acoesPara(detectar('123456/RJ')).map(x => x.id)).toContain('importar')
    expect(acoesPara(detectar(''))).toEqual([])
  })
  it('nome com acento é codificado nos links', () => {
    expect(acoesPara(detectar('José da Conceição')).find(x => x.id === 'escavador')?.href).toContain('Jos%C3%A9')
  })
})

describe('listas de diligência e cobertura', () => {
  it('quatro assuntos, itens únicos e com fonte', () => {
    expect(DILIGENCIAS.map(d => d.id)).toEqual(['empresa', 'pessoa', 'imovel', 'processo'])
    for (const d of DILIGENCIAS) {
      const ids = d.itens.map(i => i.id); expect(new Set(ids).size).toBe(ids.length)
      for (const i of d.itens) { expect(i.fonte.length).toBeGreaterThan(3); if (i.link) expect(i.link).toMatch(/^https:\/\//) }
    }
  })
  it('certidões com validade conhecida trazem o prazo', () => {
    const emp = DILIGENCIAS.find(d => d.id === 'empresa')!
    expect(emp.itens.find(i => i.id === 'cnd-federal')?.validade).toBe('180 dias')
    expect(emp.itens.find(i => i.id === 'crf')?.validade).toBe('30 dias')
  })
  it('cobertura diz o limite de cada fonte, sem prometer o que ela não entrega', () => {
    for (const c of COBERTURA) { expect(c.limite.length).toBeGreaterThan(10); expect(c.historico.length).toBeGreaterThan(5) }
    expect(COBERTURA.find(c => c.fonte.startsWith('DataJud'))?.limite).toMatch(/nem o inteiro teor/)
  })
  it('texto da lista para copiar conta os itens conferidos', () => {
    const d = DILIGENCIAS[0]
    const t = textoDiligencia(d, { cnpj: true }, 'ACME Ltda')
    expect(t).toContain('1 de ' + d.itens.length + ' itens conferidos'); expect(t).toContain('[x] Cartão CNPJ'); expect(t).toContain('ACME Ltda')
  })
})
