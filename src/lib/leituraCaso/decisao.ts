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

// ---------- Derivados da literatura (ver referencias.ts) ----------

/**
 * Encolhimento empírico (Efron e Morris, 1975): a taxa da vara, com poucas sentenças, é puxada
 * para a do tribunal. k é o "peso" da taxa do tribunal, em sentenças equivalentes.
 */
export function encolher(orgao: { chance: number; amostra: number }, tribunal: number, k = 50): { chance: number; pesoOrgao: number } {
  const n = Math.max(0, orgao.amostra)
  const sucessos = (orgao.chance / 100) * n
  const chance = Math.round(((sucessos + k * (tribunal / 100)) / (n + k)) * 100)
  return { chance, pesoOrgao: Math.round((n / (n + k)) * 100) }
}

/** Fatores do caso para ajustar a taxa base (Tetlock e Gardner, 2015: começar de fora, ajustar por dentro). */
export const FATORES_AJUSTE: { id: string; texto: string }[] = [
  { id: 'prova', texto: 'Prova documental do nosso lado' },
  { id: 'jurisprudencia', texto: 'Jurisprudência do tribunal sobre o tema' },
  { id: 'testemunhas', texto: 'Testemunhas e depoimentos' },
  { id: 'tese', texto: 'Força da tese jurídica' },
  { id: 'adversario', texto: 'Defesa da outra parte (mais forte puxa para baixo)' },
]
export const ESCALA_AJUSTE: [number, string][] = [[-2, 'Muito contra'], [-1, 'Contra'], [0, 'Neutro'], [1, 'A favor'], [2, 'Muito a favor']]
// Cada degrau multiplica a chance relativa (odds) por 1,5: ajuste moderado, como recomendam os superprevisores.
const RAZAO_POR_DEGRAU = 1.5

/**
 * Ajusta a taxa base pelos fatores do caso, em razão de chances. "aFavorDoAutor" diz para que lado
 * o advogado avalia: se representamos o réu, "a favor" reduz a chance do autor.
 */
export function ajustarTaxaBase(base: number, ajustes: Record<string, number>, aFavorDoAutor: boolean): { chance: number; degraus: number } {
  const p = Math.min(99, Math.max(1, base)) / 100
  const degraus = Object.values(ajustes).reduce((s, v) => s + (Number.isFinite(v) ? v : 0), 0) * (aFavorDoAutor ? 1 : -1)
  const odds = (p / (1 - p)) * Math.pow(RAZAO_POR_DEGRAU, degraus)
  return { chance: Math.round((odds / (1 + odds)) * 100), degraus }
}

/**
 * Zona de acordo (Cooter e Rubinfeld, 1989): existe quando o mínimo que o autor aceita
 * fica abaixo do máximo que o réu paga. Cada lado usa a própria estimativa de chance e os próprios custos.
 */
export function zonaDeAcordo(p: Premissas, outro: { chanceAutor: number; custos: number }) {
  const autorChance = p.lado === 'autor' ? p.chanceAutor : outro.chanceAutor
  const reuChance = p.lado === 'reu' ? p.chanceAutor : outro.chanceAutor
  const autorCustos = p.lado === 'autor' ? p.custos : outro.custos
  const reuCustos = p.lado === 'reu' ? p.custos : outro.custos
  const minimoAutor = Math.max(0, decidir({ ...p, lado: 'autor', chanceAutor: autorChance, custos: autorCustos, proposta: 0 }).valorEsperado)
  const maximoReu = decidir({ ...p, lado: 'reu', chanceAutor: reuChance, custos: reuCustos, proposta: 0 }).acordoEquivalente
  const existe = maximoReu >= minimoAutor
  return { minimoAutor, maximoReu, existe, meio: existe ? Math.round(((minimoAutor + maximoReu) / 2) * 100) / 100 : null }
}
