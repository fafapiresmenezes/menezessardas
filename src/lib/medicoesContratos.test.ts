import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import {
  REGUA, diasDeAtraso, grauDoAtraso, paradaAutomatica, acaoSugerida, avisos, resumoDoContrato,
  type Contrato, type MedicaoContrato,
} from './medicoesContratos'

/**
 * O que estes testes prendem, e é o coração do pedido: a régua de atraso em cada degrau, e a
 * garantia de que serviço de projeto PÚBLICO nunca para sozinho, em nenhuma combinação — nem com
 * cláusula de suspensão marcada, nem com um ano de atraso.
 * O que eles NÃO conferem: que o aviso saia por e-mail. Isso é função de servidor, e vai na volta
 * em que a migração 133 for aplicada; enquanto não for, a tela avisa e o e-mail não.
 */
const HOJE = new Date('2026-11-13T12:00:00Z')

const contrato = (c: Partial<Contrato> = {}): Contrato => ({
  id: 'c1', cliente: 'Cliente', plataforma: 'engenharia', natureza: 'privado',
  objeto: 'Laudo mensal', valor_total: 120000, periodicidade: 'mensal',
  prazo_pagamento_dias: 30, clausula_suspensao: false, servico_suspenso: false, ...c,
})
const medicao = (m: Partial<MedicaoContrato> = {}): MedicaoContrato => ({
  id: 'm1', contrato_id: 'c1', numero: 1, periodo: '10/2026', valor_medido: 10000,
  aprovada_em: '2026-10-31', faturada_em: '2026-10-31', vencimento: '2026-11-12',
  recebida_em: null, ...m,
})

describe('medição de contrato', () => {
  it('conta os dias de atraso, e medição recebida não atrasa nunca', () => {
    expect(diasDeAtraso(medicao({ vencimento: '2026-11-12' }), HOJE)).toBe(1)
    expect(diasDeAtraso(medicao({ vencimento: '2026-11-20' }), HOJE)).toBe(0)
    expect(diasDeAtraso(medicao({ vencimento: '2026-01-01', recebida_em: '2026-02-01' }), HOJE)).toBe(0)
  })

  it('a régua do privado: 1 dia avisa, 10 avisa de novo, 30 para', () => {
    const c = contrato()
    const emDias = (d: number) => {
      const v = new Date(HOJE); v.setUTCDate(v.getUTCDate() - d)
      return medicao({ vencimento: v.toISOString().slice(0, 10) })
    }
    expect(grauDoAtraso(c, emDias(0), HOJE)).toBe('em_dia')
    expect(grauDoAtraso(c, emDias(REGUA.privado.avisar), HOJE)).toBe('avisar')
    expect(grauDoAtraso(c, emDias(REGUA.privado.avisarDeNovo), HOJE)).toBe('avisar_de_novo')
    expect(grauDoAtraso(c, emDias(REGUA.privado.parar), HOJE)).toBe('parar')
  })

  it('a régua do público é mais longa que a do privado', () => {
    expect(REGUA.publico.avisarDeNovo).toBeGreaterThan(REGUA.privado.avisarDeNovo)
    expect(REGUA.publico.parar).toBeGreaterThan(REGUA.privado.parar)
  })

  it('projeto público NUNCA para o serviço sozinho, em nenhuma combinação', () => {
    const atrasadissima = medicao({ vencimento: '2025-01-01' })
    for (const clausula of [true, false]) {
      const c = contrato({ natureza: 'publico', clausula_suspensao: clausula })
      expect(grauDoAtraso(c, atrasadissima, HOJE)).toBe('parar')
      expect(paradaAutomatica(c, atrasadissima, HOJE)).toBe(false)
      expect(acaoSugerida(c, atrasadissima, HOJE)).toMatch(/advogado/i)
    }
  })

  it('projeto privado só para com cláusula de suspensão no contrato', () => {
    const atrasadissima = medicao({ vencimento: '2025-01-01' })
    expect(paradaAutomatica(contrato({ clausula_suspensao: true }), atrasadissima, HOJE)).toBe(true)
    expect(paradaAutomatica(contrato({ clausula_suspensao: false }), atrasadissima, HOJE)).toBe(false)
    expect(acaoSugerida(contrato({ clausula_suspensao: false }), atrasadissima, HOJE)).toMatch(/não tem cláusula/i)
  })

  it('a lista de avisos vem do pior para o menos grave, e ignora o que está em dia', () => {
    const c1 = contrato({ id: 'c1', clausula_suspensao: true })
    const c2 = contrato({ id: 'c2', cliente: 'Outro' })
    const lista = avisos([c1, c2], [
      medicao({ id: 'a', contrato_id: 'c2', vencimento: '2026-11-12' }),          // 1 dia
      medicao({ id: 'b', contrato_id: 'c1', vencimento: '2025-06-01' }),          // muito
      medicao({ id: 'c', contrato_id: 'c2', vencimento: '2026-12-30' }),          // em dia
      medicao({ id: 'd', contrato_id: 'c1', vencimento: '2026-10-30' }),          // 14 dias
    ], HOJE)
    expect(lista.map(a => a.medicao.id)).toEqual(['b', 'd', 'a'])
    expect(lista[0].automatica).toBe(true)
  })

  it('o resumo soma medido, recebido e a receber sem perder centavo', () => {
    const c = contrato({ valor_total: 1000 })
    const r = resumoDoContrato(c, [
      medicao({ id: '1', valor_medido: 333.33, recebida_em: '2026-11-01' }),
      medicao({ id: '2', valor_medido: 166.67 }),
    ])
    expect(r.medido).toBe(500)
    expect(r.recebido).toBe(333.33)
    expect(r.aReceber).toBe(166.67)
    expect(r.doContrato).toBe(50)
  })

  it('a régua e a trava do público também estão no banco, não só na tela', () => {
    const sql = readFileSync('database/migrations/133_medicoes_de_contrato.sql', 'utf8')
    expect(sql).toMatch(/create or replace function public\.medicao_grau/i)
    expect(sql).toMatch(/c\.natureza = 'privado'/)
    expect(sql).toMatch(/medicoes_para_avisar/)
  })
})
