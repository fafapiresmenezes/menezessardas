// Passo 417: vocabulário do nicho — checklist de documentos por tipo/uso/UF e tipos de contrato por uso.
import { describe, it, expect } from 'vitest'
import { checklistDocumentos, tiposContratoParaUso, TIPOS_DOCUMENTO, TIPOS_IMOVEL, USOS_IMOVEL } from './dominio'
import { rotulosTipoDocumento, siglaDocumento } from './rotulos'

const tipos = (lista: { tipo: string }[]) => lista.map(i => i.tipo)

describe('checklistDocumentos', () => {
  it('base: matrícula e IPTU sempre; habite-se para edificado pronto', () => {
    expect(tipos(checklistDocumentos('terreno', 'vago', 'RJ'))).toEqual(['matricula_rgi', 'iptu'])
    expect(tipos(checklistDocumentos('casa', 'vago', 'RJ'))).toEqual(['matricula_rgi', 'iptu', 'habite_se'])
  })
  it('apartamento locado: contrato, vistoria, seguro (não obrigatório) e convenção', () => {
    const l = checklistDocumentos('apartamento', 'locado', 'RJ')
    expect(tipos(l)).toEqual(['matricula_rgi', 'iptu', 'habite_se', 'contrato', 'laudo_vistoria', 'seguro_incendio', 'convencao_condominio'])
    expect(l.find(i => i.tipo === 'seguro_incendio')?.obrigatorio).toBe(false)
    expect(l.find(i => i.tipo === 'convencao_condominio')?.obrigatorio).toBe(false)
  })
  it('loja locada: bombeiros (CBMERJ no RJ, AVCB fora), alvará obrigatório e seguro obrigatório', () => {
    const rj = checklistDocumentos('loja', 'locado', 'RJ')
    expect(rj.find(i => i.tipo === 'avcb')?.rotulo).toBe('Certificado de Aprovação do CBMERJ')
    expect(checklistDocumentos('loja', 'locado', 'SP').find(i => i.tipo === 'avcb')?.rotulo).toMatch(/^AVCB/)
    expect(rj.find(i => i.tipo === 'alvara_funcionamento')?.obrigatorio).toBe(true)
    expect(rj.find(i => i.tipo === 'seguro_incendio')?.obrigatorio).toBe(true)
    expect(checklistDocumentos('loja', 'vago', 'RJ').find(i => i.tipo === 'alvara_funcionamento')?.obrigatorio).toBe(false)
  })
  it('em construção: alvará de obra no lugar do habite-se; hotel exige certidões do operador', () => {
    const obra = tipos(checklistDocumentos('edificio', 'em_construcao', 'RJ'))
    expect(obra).toContain('alvara_construcao')
    expect(obra).not.toContain('habite_se')
    expect(tipos(checklistDocumentos('hotel', 'locado', 'RJ'))).toContain('certidao_negativa')
  })
  it('todo tipo de documento do checklist existe no vocabulário, com rótulo e sigla', () => {
    const conhecidos = new Set(TIPOS_DOCUMENTO.map(d => d.valor))
    for (const t of TIPOS_IMOVEL) for (const u of USOS_IMOVEL) for (const item of checklistDocumentos(t.valor, u.valor, 'RJ')) {
      expect(conhecidos.has(item.tipo)).toBe(true)
      expect(rotulosTipoDocumento[item.tipo]).toBeTruthy()
      expect(siglaDocumento[item.tipo]).toBeTruthy()
    }
  })
})

describe('tiposContratoParaUso', () => {
  it('locado tem as locações; comodato só comodato; demais caem em SLA de fornecedor', () => {
    expect(tiposContratoParaUso('locado')).toContain('locacao_comercial')
    expect(tiposContratoParaUso('comodato')).toEqual(['comodato'])
    expect(tiposContratoParaUso('uso_proprio')).toEqual(['sla_fornecedor'])
    expect(tiposContratoParaUso('em_construcao')).toEqual(['built_to_suit', 'sla_fornecedor'])
    expect(tiposContratoParaUso('vago')).toEqual(['sla_fornecedor'])
  })
})
