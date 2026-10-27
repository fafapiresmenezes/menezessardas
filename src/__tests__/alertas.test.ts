import { describe, expect, it } from 'vitest'
import { calcularAlertas, type Contrato, type Imovel } from '@/lib/repositorio'
import { emDias } from '@/lib/datas'

const imovel = { id: 'i1', endereco: 'Av. Atlântica, 1000', cidade: 'Rio de Janeiro', documentos: [] } as unknown as Imovel
const base = {
  id: 'c1', imovelId: 'i1', tipo: 'locacao_residencial', parte: 'Locatário', dataInicio: emDias(-200),
  valor: 5000, periodicidade: 'mensal', indice: 'fixo', garantia: 'caucao', dataUltimoReajuste: null,
  notas: '', criadoEm: emDias(-200), documentos: [],
} as unknown as Contrato

describe('calcularAlertas', () => {
  it('gera vencimento com dias restantes corretos', () => {
    const a = calcularAlertas([imovel], [{ ...base, dataVencimento: emDias(30) }])
    const v = a.find(x => x.tipo === 'vencimento')!
    expect(v.diasRestantes).toBe(30)
    expect(v.imovel).toContain('Av. Atlântica')
  })
  it('contrato encerrado não gera vencimento', () => {
    const a = calcularAlertas([imovel], [{ ...base, dataVencimento: emDias(10), encerradoEm: emDias(-1) }])
    expect(a.some(x => x.tipo === 'vencimento')).toBe(false)
  })
  it('índice IPCA gera reajuste anual antes do vencimento', () => {
    const a = calcularAlertas([imovel], [{ ...base, indice: 'ipca', dataVencimento: emDias(600) } as Contrato])
    expect(a.some(x => x.tipo === 'reajuste')).toBe(true)
  })
  it('documento com validade vira alerta', () => {
    const doc = { id: 'd1', tipo: 'avcb', nome: 'AVCB', enviadoEm: emDias(-10), dataVencimento: emDias(15) }
    const a = calcularAlertas([imovel], [{ ...base, dataVencimento: null, documentos: [doc] } as unknown as Contrato])
    expect(a.find(x => x.tipo === 'documento')?.diasRestantes).toBe(15)
  })
})

import { receitaEmRisco } from '@/lib/indicadores'

describe('receitaEmRisco', () => {
  it('mede a parte da receita que vence em até 90 dias', () => {
    const perto = { ...base, id: 'a', valor: 3000, dataVencimento: emDias(40) } as Contrato
    const longe = { ...base, id: 'b', valor: 7000, dataVencimento: emDias(400) } as Contrato
    expect(receitaEmRisco([perto, longe], 10000)).toBe(30)
    expect(receitaEmRisco([], 0)).toBe(0)
  })
})

describe('renovatória', () => {
  const comercial = { ...base, tipo: 'locacao_comercial' } as Contrato
  it('avisa o prazo de 6 meses antes do fim em locação comercial de 5 anos', () => {
    const c = { ...comercial, dataInicio: emDias(-5 * 365), dataVencimento: emDias(300) } as Contrato
    const r = calcularAlertas([imovel], [c]).find(a => a.tipo === 'renovatoria')
    expect(r).toBeTruthy()
    expect(r!.diasRestantes).toBeGreaterThan(110)
    expect(r!.diasRestantes).toBeLessThan(130)
  })
  it('não avisa em locação comercial curta nem residencial', () => {
    const curta = { ...comercial, dataInicio: emDias(-300), dataVencimento: emDias(400) } as Contrato
    const resid = { ...base, dataInicio: emDias(-5 * 365), dataVencimento: emDias(300) } as Contrato
    expect(calcularAlertas([imovel], [curta, resid]).some(a => a.tipo === 'renovatoria')).toBe(false)
  })
})
