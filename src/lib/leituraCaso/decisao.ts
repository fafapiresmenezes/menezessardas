// Apoio à decisão: quanto vale seguir com o processo frente a um acordo hoje.
// Valor esperado simples, com cada premissa à vista. Não é previsão do resultado, é aritmética das premissas.

export interface Premissas {
  lado: 'autor' | 'reu'
  valorPedido: number        // R$ em discussão
  chanceAutor: number        // 0 a 100: chance de o autor vencer (procedência; parcial conta metade na jurimetria)
  custos: number             // custas, perícia, honorários contratuais ainda a gastar por quem decide
  sucumbenciaPct: number     // honorários de sucumbência (CPC, art. 85, §2º: 10 a 20%)
  meses: number              // tempo até receber/pagar
  jurosMesPct: number        // custo do dinheiro no tempo, ao mês
  proposta: number           // acordo oferecido agora
}

export interface Resultado {
  valorEsperado: number      // em reais de hoje; positivo = o que o lado espera ganhar, negativo = o que espera pagar
  acordoEquivalente: number  // acordo que deixa o lado indiferente
  recomendacao: 'aceitar' | 'recusar' | 'indiferente'
  diferenca: number          // proposta menos o equivalente (para o autor) ou equivalente menos proposta (para o réu)
  passos: string[]
}

const r = (v: number) => Math.round(v * 100) / 100
const moeda = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export function decidir(p: Premissas): Resultado {
  const pa = Math.min(100, Math.max(0, p.chanceAutor)) / 100
  const desconto = Math.pow(1 + Math.max(0, p.jurosMesPct) / 100, Math.max(0, p.meses))
  const sucumb = Math.max(0, p.sucumbenciaPct) / 100
  const passos: string[] = []
  let ve: number
  if (p.lado === 'autor') {
    const ganhoFuturo = pa * p.valorPedido
    const perdaSucumbencia = (1 - pa) * sucumb * p.valorPedido
    ve = (ganhoFuturo - perdaSucumbencia) / desconto - p.custos
    passos.push(`${Math.round(pa * 100)}% × ${moeda(p.valorPedido)} = ${moeda(ganhoFuturo)} esperados ao fim`)
    if (perdaSucumbencia) passos.push(`menos ${Math.round((1 - pa) * 100)}% × ${p.sucumbenciaPct}% de sucumbência = ${moeda(perdaSucumbencia)}`)
    if (desconto > 1) passos.push(`trazido a valor de hoje (${p.meses} meses a ${p.jurosMesPct}% a.m.): ÷ ${desconto.toFixed(3)}`)
    if (p.custos) passos.push(`menos custos a gastar: ${moeda(p.custos)}`)
  } else {
    const pagamentoFuturo = pa * p.valorPedido * (1 + sucumb)
    ve = -(pagamentoFuturo / desconto + p.custos)
    passos.push(`${Math.round(pa * 100)}% × ${moeda(p.valorPedido)} com ${p.sucumbenciaPct}% de sucumbência = ${moeda(pagamentoFuturo)} esperados a pagar`)
    if (desconto > 1) passos.push(`trazido a valor de hoje (${p.meses} meses a ${p.jurosMesPct}% a.m.): ÷ ${desconto.toFixed(3)}`)
    if (p.custos) passos.push(`mais custos a gastar: ${moeda(p.custos)}`)
  }
  ve = r(ve)
  const equivalente = r(Math.abs(ve))
  const diferenca = r(p.lado === 'autor' ? p.proposta - ve : equivalente - p.proposta)
  const margem = Math.max(1, equivalente * 0.03)
  const recomendacao = !p.proposta ? 'indiferente' : Math.abs(diferenca) <= margem ? 'indiferente' : diferenca > 0 ? 'aceitar' : 'recusar'
  return { valorEsperado: ve, acordoEquivalente: p.lado === 'autor' ? Math.max(0, ve) : equivalente, recomendacao, diferenca, passos }
}

/** Sensibilidade: o mesmo cálculo nas pontas da margem de erro da chance. */
export function faixaDecisao(p: Premissas, faixa: { min: number; max: number } | null) {
  if (!faixa) return null
  return { pior: decidir({ ...p, chanceAutor: p.lado === 'autor' ? faixa.min : faixa.max }), melhor: decidir({ ...p, chanceAutor: p.lado === 'autor' ? faixa.max : faixa.min }) }
}
