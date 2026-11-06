// Passos 413–414: indicadores da carteira — KPIs, receita em risco, OKRs e matrizes.
import { describe, it, expect } from 'vitest'
import { contratoAtivo, valorMensal, calcularKPIs, receitaEmRisco, calcularOKRs, aplicarMetas, matrizRisco, matrizPendencias } from './indicadores'
import type { Contrato, Imovel, Alerta } from './repositorio'
import { emDias } from './datas'

const imovel = (id: string, uso: Imovel['uso'], docs: string[] = []): Imovel => ({
  id, endereco: `Rua ${id}`, cidade: 'Rio de Janeiro', uf: 'RJ', tipo: 'apartamento' as Imovel['tipo'], uso, proprietario: 'P', matricula: '1', notas: '',
  documentos: docs.map((v, i) => ({ id: `${id}-d${i}`, tipo: 'outro' as never, nome: 'doc', enviadoEm: emDias(-30), dataVencimento: v })),
})
const contrato = (id: string, imovelId: string, valor: number, periodicidade: Contrato['periodicidade'], venc: string | null, extra: Partial<Contrato> = {}): Contrato => ({
  id, imovelId, tipo: 'locacao' as Contrato['tipo'], parte: 'Locatário', dataInicio: emDias(-200), dataVencimento: venc, valor, periodicidade,
  indice: 'igpm', garantia: 'caucao', dataUltimoReajuste: null, notas: '', criadoEm: emDias(-200), documentos: [], ...extra,
} as Contrato)

describe('contratoAtivo / valorMensal', () => {
  it('ativo sem vencimento ou com vencimento hoje/futuro; encerrado ou vencido não', () => {
    expect(contratoAtivo(contrato('a', 'i', 1, 'mensal', null))).toBe(true)
    expect(contratoAtivo(contrato('a', 'i', 1, 'mensal', emDias(0)))).toBe(true)
    expect(contratoAtivo(contrato('a', 'i', 1, 'mensal', emDias(-1)))).toBe(false)
    expect(contratoAtivo(contrato('a', 'i', 1, 'mensal', emDias(50), { encerradoEm: emDias(-1) }))).toBe(false)
  })
  it('converte a periodicidade para valor mensal; parcela única não entra', () => {
    expect(valorMensal(contrato('a', 'i', 3000, 'mensal', null))).toBe(3000)
    expect(valorMensal(contrato('a', 'i', 3000, 'trimestral', null))).toBe(1000)
    expect(valorMensal(contrato('a', 'i', 12000, 'anual', null))).toBe(1000)
    expect(valorMensal(contrato('a', 'i', 5000, 'unica', null))).toBe(0)
  })
})

describe('calcularKPIs', () => {
  const imoveis = [imovel('1', 'locado', [emDias(300), emDias(-5)]), imovel('2', 'vago'), imovel('3', 'locado', [emDias(30)]), imovel('4', 'vago')]
  const contratos = [
    contrato('c1', '1', 3000, 'mensal', emDias(100)),
    contrato('c2', '3', 6000, 'trimestral', emDias(200)),
    contrato('c3', '3', 1000, 'mensal', emDias(-10)),
  ]
  it('vacância, receita mensal ativa, documentação em dia, prazo médio e vencidos', () => {
    expect(calcularKPIs(imoveis, contratos)).toEqual({
      imoveis: 4, vacancia: 50, receitaContratadaMensal: 5000, documentacaoEmDia: 33, prazoMedioDias: 150, contratosVencidos: 1,
    })
  })
  it('carteira vazia não divide por zero', () => {
    expect(calcularKPIs([], [])).toEqual({ imoveis: 0, vacancia: 0, receitaContratadaMensal: 0, documentacaoEmDia: 100, prazoMedioDias: null, contratosVencidos: 0 })
  })
})

describe('receitaEmRisco / OKRs', () => {
  const contratos = [contrato('c1', '1', 3000, 'mensal', emDias(30)), contrato('c2', '2', 7000, 'mensal', emDias(300))]
  it('receita em risco = parte da receita ativa que vence em até 90 dias', () => {
    expect(receitaEmRisco(contratos, 10000)).toBe(30)
    expect(receitaEmRisco(contratos, 0)).toBe(0)
  })
  it('OKRs trazem 3 objetivos com metas fixas e valores derivados', () => {
    const alertas: Alerta[] = [{ id: 'a', imovelId: '1', imovel: 'Rua 1', tipo: 'documento', titulo: 'x', dataEvento: emDias(-2), diasRestantes: -2 }]
    const okrs = calcularOKRs([imovel('1', 'locado'), imovel('2', 'locado')], contratos, alertas)
    expect(okrs.map(o => o.titulo)).toEqual(['Manter a carteira regular', 'Antecipar renovações e reajustes', 'Proteger a receita da carteira'])
    expect(okrs[0].keyResults[0]).toMatchObject({ atual: 50, meta: 90 })
    expect(okrs[1].keyResults[0]).toMatchObject({ atual: 50, meta: 80 })
    expect(okrs[2].keyResults[1]).toMatchObject({ atual: 30, meta: 15, menorMelhor: true })
  })
})

describe('matrizes', () => {
  it('risco: probabilidade pelo prazo (30/120 dias) e impacto pelo valor mensal (5 mil/20 mil)', () => {
    const r = matrizRisco([imovel('1', 'locado')], [
      contrato('c1', '1', 25000, 'mensal', emDias(10)),
      contrato('c2', '1', 6000, 'mensal', emDias(100)),
      contrato('c3', 'x', 1000, 'mensal', null),
    ])
    expect(r.map(p => [p.rotulo, p.probabilidade, p.impacto])).toEqual([
      ['Rua 1', 'alto', 'alto'], ['Rua 1', 'medio', 'medio'], ['Locatário', 'baixo', 'baixo'],
    ])
  })
  it('pendências: urgência pelos dias restantes e importância pelo tipo', () => {
    const base = { imovelId: '1', imovel: 'Rua 1', titulo: 't', dataEvento: emDias(0) }
    const r = matrizPendencias([
      { ...base, id: 'a', tipo: 'vencimento', diasRestantes: -3 },
      { ...base, id: 'b', tipo: 'reajuste', diasRestantes: 60 },
      { ...base, id: 'c', tipo: 'renovatoria', diasRestantes: 200 },
    ])
    expect(r.map(p => [p.urgencia, p.importancia])).toEqual([['alto', 'alto'], ['medio', 'medio'], ['baixo', 'alto']])
  })
})

describe('D04: metas dos OKRs editáveis', () => {
  it('aplicarMetas troca só as metas informadas e ignora valores inválidos; calcularOKRs aceita as metas', () => {
    const base = [{ titulo: 'O', keyResults: [{ descricao: 'A', atual: 1, meta: 90, unidade: '%' as const }, { descricao: 'B', atual: 1, meta: 0, unidade: 'un' as const }] }]
    const r = aplicarMetas(base, { A: 80, B: Number.NaN, C: 5 })
    expect(r[0].keyResults.map(k => k.meta)).toEqual([80, 0])
    expect(aplicarMetas(base, null)).toBe(base)
    const okrs = calcularOKRs([], [], [], { 'Documentação em dia': 99 })
    expect(okrs[0].keyResults.find(k => k.descricao === 'Documentação em dia')!.meta).toBe(99)
  })
})
