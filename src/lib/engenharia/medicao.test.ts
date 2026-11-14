// A medição de obra é o que define quanto o construtor recebe. Erro aqui é dinheiro errado, então o
// teste persegue os casos em que uma planilha mal preenchida produziria número bonito e falso.
import { describe, it, expect } from 'vitest'
import { medirObra, pesos, desvioDeAvanco, boletimDeMedicao, valorPrevisto, SUGESTOES, type Indicador, type Lancamento } from './medicao'

const ind = (id: string, extra: Partial<Indicador> = {}): Indicador => ({
  id, nome: `Serviço ${id}`, unidade: 'm', quantidadePrevista: 100, comoMedir: 'medido em campo', ...extra,
})

describe('peso de cada serviço', () => {
  it('sai do valor do serviço quando há preço, e não da contagem de linhas', () => {
    // Um serviço de R$ 90.000 e outro de R$ 10.000: 90% e 10%, nunca 50% e 50%.
    const r = pesos([ind('a', { precoUnitario: 900 }), ind('b', { precoUnitario: 100 })])
    expect(r.regra).toBe('pelo valor de cada serviço')
    expect(r.pesos).toEqual([90, 10])
  })

  it('respeita o peso informado pelo cliente e normaliza para somar 100', () => {
    const r = pesos([ind('a', { pesoPorcento: 30, precoUnitario: 900 }), ind('b', { pesoPorcento: 10, precoUnitario: 100 })])
    expect(r.regra).toBe('informado pelo cliente')
    expect(r.pesos).toEqual([75, 25])
    expect(r.avisos.join(' ')).toContain('somam 40,00%')
  })

  it('ignora peso informado pela metade, porque meia régua é régua torta', () => {
    const r = pesos([ind('a', { pesoPorcento: 80, precoUnitario: 100 }), ind('b', { precoUnitario: 900 })])
    expect(r.regra).toBe('pelo valor de cada serviço')
    expect(r.pesos).toEqual([10, 90])
    expect(r.avisos.join(' ')).toContain('1 de 2 serviços')
  })

  it('sem preço e sem peso, divide igual e DIZ que fez isso', () => {
    const r = pesos([ind('a'), ind('b'), ind('c'), ind('d')])
    expect(r.regra).toBe('peso igual para todos')
    expect(r.pesos).toEqual([25, 25, 25, 25])
    expect(r.avisos.join(' ')).toContain('peso igual para todos')
  })

  it('avisa qual serviço entrou com peso zero por não ter preço', () => {
    const r = pesos([ind('a', { precoUnitario: 10 }), ind('b', { nome: 'Pintura' })])
    expect(r.avisos.join(' ')).toContain('Pintura')
  })

  it('lista vazia não quebra nem inventa peso', () => {
    expect(pesos([])).toEqual({ pesos: [], regra: 'peso igual para todos', avisos: ['Nenhum serviço na lista: nada a medir.'] })
  })
})

describe('medição do período', () => {
  const indicadores = [
    ind('a', { nome: 'Tubulação', unidade: 'm', quantidadePrevista: 1000, precoUnitario: 90 }),
    ind('b', { nome: 'Guarita', unidade: 'vb', quantidadePrevista: 1, precoUnitario: 10000 }),
  ]
  // Contrato: 1000 × 90 = 90.000 na tubulação, 10.000 na guarita. Total 100.000.
  const lanc: Lancamento[] = [
    { indicadorId: 'a', periodo: '2026-10', quantidadeAcumulada: 400 },
    { indicadorId: 'a', periodo: '2026-11', quantidadeAcumulada: 700 },
    { indicadorId: 'b', periodo: '2026-11', quantidadeAcumulada: 1 },
  ]

  it('paga a diferença contra o período anterior, não o acumulado inteiro', () => {
    const { valores } = medirObra(indicadores, lanc, '2026-11')
    const tub = valores.porIndicador.find(x => x.indicador.id === 'a')!
    expect(tub.quantidadeDoPeriodo).toBe(300)
    expect(tub.valorDoPeriodo).toBe(27000)
    expect(tub.valorAcumulado).toBe(63000)
    expect(valores.valorDoPeriodo).toBe(27000 + 10000)
    expect(valores.valorAcumulado).toBe(73000)
    expect(valores.valorDoContrato).toBe(100000)
  })

  it('a primeira medição paga o acumulado, porque não há período anterior', () => {
    const { valores } = medirObra(indicadores, lanc, '2026-10')
    expect(valores.valorDoPeriodo).toBe(36000)
    expect(valores.valorAcumulado).toBe(36000)
  })

  it('o avanço físico pondera pelo peso: 70% de um serviço de 90% do contrato não é 70% de obra', () => {
    const { valores } = medirObra(indicadores, lanc, '2026-11')
    // 90% × 70% + 10% × 100% = 63 + 10 = 73
    expect(valores.avancoFisicoPorcento).toBe(73)
  })

  it('serviço sem lançamento no período conta como zero, e não desaparece da lista', () => {
    const { valores } = medirObra(indicadores, [{ indicadorId: 'a', periodo: '2026-11', quantidadeAcumulada: 100 }], '2026-11')
    expect(valores.porIndicador).toHaveLength(2)
    expect(valores.porIndicador[1].quantidadeAcumulada).toBe(0)
    expect(valores.porIndicador[1].avancoPorcento).toBe(0)
  })

  it('não deixa passar medição acima do previsto sem dizer em voz alta', () => {
    const { valores, avisos } = medirObra(indicadores, [{ indicadorId: 'a', periodo: '2026-11', quantidadeAcumulada: 1200 }], '2026-11')
    expect(valores.porIndicador[0].avancoPorcento).toBe(100)
    expect(avisos.join(' ')).toContain('aditivo assinado')
  })

  it('acumulado que diminui é erro de lançamento, e o aviso diz isso', () => {
    const { avisos, valores } = medirObra(indicadores, [
      { indicadorId: 'a', periodo: '2026-10', quantidadeAcumulada: 700 },
      { indicadorId: 'a', periodo: '2026-11', quantidadeAcumulada: 400 },
    ], '2026-11')
    expect(avisos.join(' ')).toContain('Acumulado não desce')
    // e o período não vira negativo, que seria devolver dinheiro por engano
    expect(valores.porIndicador[0].quantidadeDoPeriodo).toBe(0)
    expect(valores.valorDoPeriodo).toBe(0)
  })

  it('sem preço nenhum, mede em porcentagem e avisa que não dá valor a pagar', () => {
    const { valores, avisos } = medirObra([ind('a'), ind('b')], [{ indicadorId: 'a', periodo: '2026-11', quantidadeAcumulada: 50 }], '2026-11')
    expect(valores.valorDoPeriodo).toBeNull()
    expect(valores.valorDoContrato).toBeNull()
    expect(valores.avancoFisicoPorcento).toBe(25)
    expect(avisos.join(' ')).toContain('só em porcentagem')
  })

  it('serviço sem quantidade prevista não puxa o avanço para baixo com um zero inventado', () => {
    const r = medirObra([ind('a', { quantidadePrevista: 0 })], [], '2026-11')
    expect(r.valores.porIndicador[0].avancoPorcento).toBeNull()
    expect(r.valores.avancoFisicoPorcento).toBe(0)
  })

  it('a conta vem com os passos, para o engenheiro conferir à mão', () => {
    const { passos } = medirObra(indicadores, lanc, '2026-11')
    expect(passos.map(p => p.titulo).join(' ')).toContain('Avanço físico acumulado')
    expect(passos.some(p => p.formula.includes('Σ'))).toBe(true)
  })
})

describe('desvio contra o cronograma', () => {
  it('atrasada, em dia e adiantada, com a folga de 1 ponto', () => {
    expect(desvioDeAvanco(73, 80).valores).toEqual({ desvioPorcento: -7, situacao: 'atrasada' })
    expect(desvioDeAvanco(80.5, 80).valores.situacao).toBe('em dia')
    expect(desvioDeAvanco(90, 80).valores.situacao).toBe('adiantada')
  })

  it('o aviso de atraso não confunde medir com justificar', () => {
    expect(desvioDeAvanco(70, 80).avisos.join(' ')).toContain('não é atraso justificado')
  })
})

describe('boletim de medição', () => {
  it('traz serviço, como se mede, valores, a conta e a linha de assinatura', () => {
    const indicadores = [ind('a', { nome: 'Tubulação', quantidadePrevista: 1000, precoUnitario: 90, comoMedir: 'metros assentados e testados' })]
    const r = medirObra(indicadores, [{ indicadorId: 'a', periodo: '2026-11', quantidadeAcumulada: 700 }], '2026-11')
    const txt = boletimDeMedicao('Rede de esgoto do bairro X', 'Prefeitura Y', r.valores, r.passos, r.avisos)
    expect(txt).toContain('BOLETIM DE MEDIÇÃO — Rede de esgoto do bairro X')
    expect(txt).toContain('Prefeitura Y')
    expect(txt).toContain('metros assentados e testados')
    expect(txt).toContain('Avanço físico acumulado: 70,00%')
    expect(txt).toContain('COMO ESTA CONTA FOI FEITA')
    expect(txt).toContain('ART')
    expect(txt).toContain('Fiscalização')
  })
})

describe('sugestões de partida', () => {
  it('existem para edificação, saneamento e pavimentação, e toda linha diz como se mede', () => {
    const tipos = Object.keys(SUGESTOES)
    expect(tipos.length).toBeGreaterThanOrEqual(3)
    expect(tipos.join(' ')).toContain('Saneamento')
    for (const lista of Object.values(SUGESTOES)) {
      expect(lista.length).toBeGreaterThan(3)
      for (const i of lista) {
        expect(i.comoMedir.length).toBeGreaterThan(15)
        expect(i.unidade).toBeTruthy()
      }
    }
  })

  it('nenhuma sugestão vem com preço, porque preço é do contrato do cliente e não meu', () => {
    for (const lista of Object.values(SUGESTOES))
      for (const i of lista) expect(i.precoUnitario).toBeUndefined()
  })
})

describe('valor previsto', () => {
  it('é nulo sem preço, e não zero, para não somar como se fosse de graça', () => {
    expect(valorPrevisto(ind('a'))).toBeNull()
    expect(valorPrevisto(ind('a', { precoUnitario: 2.5, quantidadePrevista: 10 }))).toBe(25)
  })
})
