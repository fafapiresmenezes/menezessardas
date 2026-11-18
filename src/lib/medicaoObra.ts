/**
 * Medição de obra: as contas de um boletim de medição, sem banco e sem tela.
 *
 * A planilha contratual tem itens com unidade, quantidade e preço unitário. A cada período mede-se o
 * que foi executado; este arquivo soma, acumula, calcula saldo, avanço físico e financeiro, retenção e
 * amortização de adiantamento, e avisa quando a quantidade medida passa do que o contrato prevê.
 * As percentagens de retenção e de amortização são parâmetros do contrato: nada aqui presume a lei de
 * nenhum país. Todas as contas são feitas em centésimos inteiros para não acumular erro de vírgula.
 */

export interface ItemContratual {
  id: string
  descricao: string
  unidade: string
  quantidade: number
  precoUnitario: number
}

/** Quantidade executada por item: até o boletim anterior e neste período. */
export interface Medido { itemId: string; anterior: number; periodo: number }

export interface LinhaBoletim {
  itemId: string
  descricao: string
  unidade: string
  contratado: number
  anterior: number
  periodo: number
  acumulado: number
  saldo: number
  valorPeriodo: number
  valorAcumulado: number
  /** A quantidade acumulada passou da contratada: precisa de aditivo antes de pagar o excedente. */
  excedeu: boolean
}

export interface Parametros {
  /** Fração retida de cada boletim como garantia (ex.: 0.05). */
  retencao: number
  /** Fração de cada boletim usada para amortizar o adiantamento (ex.: 0.10). */
  amortizacao: number
  /** Quanto do adiantamento ainda falta amortizar antes deste boletim. */
  adiantamentoPorAmortizar: number
}

export interface Boletim {
  linhas: LinhaBoletim[]
  valorContrato: number
  valorPeriodo: number
  valorAcumulado: number
  /** Avanço financeiro: valor acumulado sobre o valor do contrato, de 0 a 1 (pode passar de 1 se excedeu). */
  avancoFinanceiro: number
  /** Avanço físico: média do avanço de cada item, ponderada pelo valor contratual do item, limitada a 1 por item. */
  avancoFisico: number
  retencao: number
  amortizacao: number
  liquidoAPagar: number
  itensExcedidos: string[]
}

const c = (v: number) => Math.round(v * 100)
const r = (centavos: number) => centavos / 100
const valido = (n: number) => Number.isFinite(n) && n >= 0

export function calcularBoletim(itens: ItemContratual[], medidos: Medido[], par: Parametros): Boletim {
  if (!valido(par.retencao) || par.retencao > 1) throw new Error('Retenção deve estar entre 0 e 1.')
  if (!valido(par.amortizacao) || par.amortizacao > 1) throw new Error('Amortização deve estar entre 0 e 1.')
  if (!valido(par.adiantamentoPorAmortizar)) throw new Error('Adiantamento por amortizar inválido.')
  const porItem = new Map(medidos.map(m => [m.itemId, m]))
  let contrato = 0, periodo = 0, acumulado = 0, fisicoPonderado = 0
  const linhas: LinhaBoletim[] = itens.map(it => {
    if (!valido(it.quantidade) || !valido(it.precoUnitario)) throw new Error(`Item ${it.id}: quantidade ou preço inválido.`)
    const m = porItem.get(it.id) ?? { itemId: it.id, anterior: 0, periodo: 0 }
    if (!valido(m.anterior) || !valido(m.periodo)) throw new Error(`Item ${it.id}: quantidade medida inválida.`)
    const acum = m.anterior + m.periodo
    const vItem = c(it.quantidade * it.precoUnitario)
    const vPer = c(m.periodo * it.precoUnitario)
    const vAcum = c(acum * it.precoUnitario)
    contrato += vItem; periodo += vPer; acumulado += vAcum
    fisicoPonderado += vItem * (it.quantidade > 0 ? Math.min(acum / it.quantidade, 1) : 0)
    return {
      itemId: it.id, descricao: it.descricao, unidade: it.unidade, contratado: it.quantidade,
      anterior: m.anterior, periodo: m.periodo, acumulado: acum, saldo: it.quantidade - acum,
      valorPeriodo: r(vPer), valorAcumulado: r(vAcum), excedeu: acum > it.quantidade + 1e-9,
    }
  })
  const ret = Math.round(periodo * par.retencao)
  const amort = Math.min(Math.round(periodo * par.amortizacao), c(par.adiantamentoPorAmortizar))
  return {
    linhas,
    valorContrato: r(contrato), valorPeriodo: r(periodo), valorAcumulado: r(acumulado),
    avancoFinanceiro: contrato > 0 ? acumulado / contrato : 0,
    avancoFisico: contrato > 0 ? fisicoPonderado / contrato : 0,
    retencao: r(ret), amortizacao: r(amort), liquidoAPagar: r(periodo - ret - amort),
    itensExcedidos: linhas.filter(l => l.excedeu).map(l => l.itemId),
  }
}

/** Desvio do avanço físico em relação ao previsto no cronograma, em pontos percentuais (negativo = atrasado). */
export function desvioDeCronograma(avancoFisico: number, previsto: number): number {
  return Math.round((avancoFisico - previsto) * 1000) / 10
}

export type Semaforo = 'verde' | 'amarelo' | 'vermelho'

/** Cor do projeto no painel: atraso em pontos percentuais e dias do boletim mais antigo parado. */
export function semaforo(desvioPontos: number, diasParado: number, limites = { amarelo: -5, vermelho: -10, diasAmarelo: 7, diasVermelho: 15 }): Semaforo {
  if (desvioPontos <= limites.vermelho || diasParado >= limites.diasVermelho) return 'vermelho'
  if (desvioPontos <= limites.amarelo || diasParado >= limites.diasAmarelo) return 'amarelo'
  return 'verde'
}
