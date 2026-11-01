// Passos 411–412: fornecedores — validação de CNPJ, SLA e situação KYC derivada.
import { describe, it, expect } from 'vitest'
import { cnpjValido, formatarCnpj, soDigitos, cumpreMeta, statusSla, slaCumprido, resumoKyc, type Fornecedor, type SLA } from './fornecedores'
import { emDias } from './datas'

const CNPJ_ESCRITORIO = '10945994000172'

describe('CNPJ', () => {
  it('aceita um CNPJ real com dígitos verificadores corretos, com ou sem máscara', () => {
    expect(cnpjValido(CNPJ_ESCRITORIO)).toBe(true)
    expect(cnpjValido('10.945.994/0001-72')).toBe(true)
  })
  it('rejeita dígito verificador errado, tamanho errado e sequências repetidas', () => {
    expect(cnpjValido('10945994000173')).toBe(false)
    expect(cnpjValido('1094599400017')).toBe(false)
    expect(cnpjValido('11111111111111')).toBe(false)
    expect(cnpjValido('')).toBe(false)
  })
  it('formata com máscara 00.000.000/0000-00 e soDigitos tira a máscara', () => {
    expect(formatarCnpj(CNPJ_ESCRITORIO)).toBe('10.945.994/0001-72')
    expect(soDigitos('10.945.994/0001-72')).toBe(CNPJ_ESCRITORIO)
  })
})

const mes = (atras: number) => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - atras); return d.toISOString().slice(0, 7) }
const sla = (sentido: 'minimo' | 'maximo', meta: number, valores: number[]): SLA => ({
  id: 's1', descricao: 'x', unidade: '%', meta, sentido, medicoes: valores.map((valor, i) => ({ mes: mes(i), valor })),
})
const fornecedor = (extra: Partial<Fornecedor> = {}): Fornecedor => ({
  id: 'f1', nome: 'Limpa Tudo', cnpj: CNPJ_ESCRITORIO, categoria: 'limpeza', imovelIds: [],
  kyc: { consultadoEm: emDias(-1), situacao: 'ATIVA', ceis: 'limpo', cnep: 'limpo' } as Fornecedor['kyc'],
  certidoes: [{ id: 'c1', nome: 'CND Federal', validade: emDias(200) }], slas: [], notas: '', ...extra,
})

describe('SLA', () => {
  it('cumpreMeta respeita o sentido mínimo/máximo', () => {
    expect(cumpreMeta(sla('minimo', 95, []), 95)).toBe(true)
    expect(cumpreMeta(sla('minimo', 95, []), 94)).toBe(false)
    expect(cumpreMeta(sla('maximo', 2, []), 2)).toBe(true)
    expect(cumpreMeta(sla('maximo', 2, []), 3)).toBe(false)
  })
  it('statusSla olha a medição mais recente', () => {
    expect(statusSla(sla('minimo', 95, [])).status).toBe('sem_medicao')
    expect(statusSla(sla('minimo', 95, [97, 80])).status).toBe('cumprido')
    expect(statusSla(sla('minimo', 95, [80, 97])).status).toBe('descumprido')
  })
  it('slaCumprido: % dos últimos 6 meses, semáforo e penalidade de 5 pontos por ocorrência aberta', () => {
    expect(slaCumprido(fornecedor()).pct).toBeNull()
    const bom = fornecedor({ slas: [sla('minimo', 95, [97, 96, 95, 99, 98])] })
    expect(slaCumprido(bom)).toMatchObject({ pct: 100, medicoes: 5, ok: 5, nivel: 'regular' })
    const medio = fornecedor({ slas: [sla('minimo', 95, [97, 80, 95, 70, 98])] })
    expect(slaCumprido(medio).pct).toBe(60)
    expect(slaCumprido(medio).nivel).toBe('critico')
    const comOcorrencia = fornecedor({ slas: [sla('minimo', 95, [97, 96, 95, 99, 98])], ocorrencias: [
      { id: 'o1', data: emDias(-10), tipo: 'atraso', descricao: '' },
      { id: 'o2', data: emDias(-10), tipo: 'elogio', descricao: '' },
      { id: 'o3', data: emDias(-10), tipo: 'falha', descricao: '', resolvidaEm: emDias(-5) },
      { id: 'o4', data: emDias(-120), tipo: 'reclamacao', descricao: '' },
    ] })
    expect(slaCumprido(comOcorrencia)).toMatchObject({ pct: 95, penalidade: 5, nivel: 'regular' })
  })
})

describe('resumoKyc', () => {
  it('regular quando CNPJ ativo, listas limpas e certidões válidas', () => {
    expect(resumoKyc(fornecedor())).toEqual({ nivel: 'regular', pendencias: [] })
  })
  it('atenção para pendências leves: não consultado, lista não verificada, certidão a vencer, sem certidão', () => {
    const r = resumoKyc(fornecedor({ kyc: { ceis: 'nao_verificado', cnep: 'limpo' } as Fornecedor['kyc'], certidoes: [] }))
    expect(r.nivel).toBe('atencao')
    expect(r.pendencias).toEqual(['CNPJ ainda não consultado na Receita', 'CEIS ainda não verificado', 'Nenhuma certidão cadastrada'])
    expect(resumoKyc(fornecedor({ certidoes: [{ id: 'c', nome: 'CRF', validade: emDias(10) }] })).pendencias).toEqual(['CRF vence em 10 dia(s)'])
  })
  it('crítico para sanção, CNPJ não ativo ou certidão vencida, e graves vêm antes das leves', () => {
    const r = resumoKyc(fornecedor({
      kyc: { consultadoEm: emDias(-1), situacao: 'BAIXADA', ceis: 'sancionado', cnep: 'nao_verificado' } as Fornecedor['kyc'],
      certidoes: [{ id: 'c', nome: 'CNDT', validade: emDias(-3) }],
    }))
    expect(r.nivel).toBe('critico')
    expect(r.pendencias).toEqual(['CNPJ com situação BAIXADA', 'Consta no CEIS (sanção)', 'CNDT vencida', 'CNEP ainda não verificado'])
  })
})
