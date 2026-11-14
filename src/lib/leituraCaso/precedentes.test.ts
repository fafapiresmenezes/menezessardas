import { describe, it, expect } from 'vitest'
import { novaLeitura, type LeituraCaso } from './roteiro'
import { featuresProcessuais, precedentesSemelhantes, faixaComPrecedentes, MINIMO_DE_PRECEDENTES } from './precedentes'

function caso(over: Partial<LeituraCaso>): LeituraCaso {
  return { ...novaLeitura(), ...over }
}

describe('precedentes', () => {
  it('extrai as features processuais públicas (ação, tribunal)', () => {
    const c = caso({ acao: 'despejo', tribunal: 'tjrj' })
    expect(featuresProcessuais(c)).toEqual({ acao: 'despejo', tribunal: 'tjrj' })
  })

  it('só considera precedente um caso com a mesma ação e tribunal, e com desfecho conhecido', () => {
    const alvo = caso({ id: 'a', acao: 'despejo', tribunal: 'tjrj' })
    const igual = caso({ id: 'b', acao: 'despejo', tribunal: 'tjrj', desfecho: 'procedente' })
    const semDesfecho = caso({ id: 'c', acao: 'despejo', tribunal: 'tjrj', desfecho: null })
    const outraAcao = caso({ id: 'd', acao: 'cobranca', tribunal: 'tjrj', desfecho: 'procedente' })
    const outroTribunal = caso({ id: 'e', acao: 'despejo', tribunal: 'tjsp', desfecho: 'procedente' })
    const semelhantes = precedentesSemelhantes(alvo, [alvo, igual, semDesfecho, outraAcao, outroTribunal])
    expect(semelhantes.map(c => c.id)).toEqual(['b'])
  })

  it(`não dá faixa com menos de ${MINIMO_DE_PRECEDENTES} precedentes — nunca estima com poucos casos`, () => {
    const alvo = caso({ id: 'a', acao: 'despejo', tribunal: 'tjrj' })
    const um = caso({ id: 'b', acao: 'despejo', tribunal: 'tjrj', desfecho: 'procedente' })
    expect(faixaComPrecedentes(alvo, [alvo, um])).toBeNull()
  })

  it('com precedentes suficientes, devolve a distribuição por desfecho e os casos usados', () => {
    const alvo = caso({ id: 'a', acao: 'despejo', tribunal: 'tjrj' })
    const casos = [
      alvo,
      caso({ id: 'b', acao: 'despejo', tribunal: 'tjrj', desfecho: 'procedente' }),
      caso({ id: 'c', acao: 'despejo', tribunal: 'tjrj', desfecho: 'procedente' }),
      caso({ id: 'd', acao: 'despejo', tribunal: 'tjrj', desfecho: 'improcedente' }),
    ]
    const r = faixaComPrecedentes(alvo, casos)
    expect(r).not.toBeNull()
    expect(r!.n).toBe(3)
    expect(r!.distribuicao.procedente).toBe(67)
    expect(r!.distribuicao.improcedente).toBe(33)
    expect(r!.casosRef.sort()).toEqual(['b', 'c', 'd'])
  })
})
