// Passo E14 do plano mestre THEYE v4: medição de obra com indicadores que o cliente muda.
//
// M pediu em 13/11/2026, às 21h23, que a plataforma de engenharia se lembrasse de "medições e
// indicadores de medição de obra mutáveis, sob medida por cliente". Este arquivo é a conta; a lista
// de indicadores não mora aqui, vem de fora, porque é dela que o cliente é dono.
//
// O que é medição de obra, para quem nunca viu uma: ao fim de cada período (mês, quinzena), mede-se
// quanto de cada serviço ficou pronto — metros de tubo assentado, metros cúbicos de concreto, metros
// quadrados de alvenaria — e disso saem duas coisas: quanto se paga ao construtor naquele período e
// quanto da obra já está feita, em porcentagem. A porcentagem não é a média simples dos serviços:
// assentar o tubo-tronco pesa mais do que pintar a guarita. O peso de cada serviço é o que esta
// biblioteca calcula e explica, passo a passo, para o engenheiro conferir e assinar.
//
// Nada aqui decide nada. É apoio: o engenheiro habilitado confere e assina com ART.
import { type Passo, type Resultado, AVISO_ENGENHARIA } from './calculo'

const r = (v: number, casas = 2) => Number(v.toFixed(casas))
const fmt = (v: number, casas = 2) => v.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas })
const dinheiro = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

/** Um serviço medível da obra. O cliente cria, renomeia, repesa e apaga à vontade. */
export interface Indicador {
  id: string
  /** Como o cliente chama o serviço. É o nome que vai no boletim de medição. */
  nome: string
  /** Unidade física: m, m², m³, kg, un, vb (verba). */
  unidade: string
  /** Quanto está previsto no contrato. Zero significa "ainda não quantificado". */
  quantidadePrevista: number
  /** Preço unitário contratado, quando houver. Sem ele, a medição sai só em porcentagem. */
  precoUnitario?: number
  /**
   * Peso do serviço no avanço da obra, em porcentagem. Opcional de propósito: quando o cliente não
   * informa, o peso sai do valor do serviço (quantidade × preço), que é como a planilha orçamentária
   * faz. Informar aqui serve para o caso em que o dono da obra discorda dessa régua.
   */
  pesoPorcento?: number
  /** O combinado de como se mede este serviço. Vai impresso no boletim, para não haver discussão. */
  comoMedir: string
}

/** O que foi medido em campo, por serviço e por período. Quantidade ACUMULADA, não do período. */
export interface Lancamento {
  indicadorId: string
  /** Período no formato AAAA-MM. */
  periodo: string
  quantidadeAcumulada: number
  /** Quem mediu, para a trilha. Opcional. */
  medidoPor?: string
}

export interface AvancoDoIndicador {
  indicador: Indicador
  pesoPorcento: number
  quantidadeAcumulada: number
  /** Quanto do serviço está pronto, de 0 a 100. Sem quantidade prevista, fica nulo. */
  avancoPorcento: number | null
  /** Quanto se mediu em dinheiro, acumulado. Sem preço, fica nulo. */
  valorAcumulado: number | null
  /** Quanto se mede neste período (acumulado de agora menos acumulado do período anterior). */
  quantidadeDoPeriodo: number
  valorDoPeriodo: number | null
}

export interface Medicao {
  periodo: string
  /** Avanço físico da obra, de 0 a 100, pela soma ponderada dos serviços. */
  avancoFisicoPorcento: number
  /** Valor acumulado medido, quando dá para calcular em dinheiro. */
  valorAcumulado: number | null
  /** Valor a pagar neste período. */
  valorDoPeriodo: number | null
  /** Valor total do contrato pelos preços informados. */
  valorDoContrato: number | null
  porIndicador: AvancoDoIndicador[]
  /** De onde saiu o peso de cada serviço, dito por extenso. */
  regraDoPeso: 'informado pelo cliente' | 'pelo valor de cada serviço' | 'peso igual para todos'
}

/** Templates de partida, por tipo de obra. O cliente muda tudo: são um ponto de partida, não uma regra. */
export const SUGESTOES: Record<string, Omit<Indicador, 'id'>[]> = {
  'Edificação': [
    { nome: 'Serviços preliminares e canteiro', unidade: 'vb', quantidadePrevista: 1, comoMedir: 'Verba: mede-se por etapa concluída, conforme cronograma aprovado' },
    { nome: 'Fundação (estacas)', unidade: 'm', quantidadePrevista: 0, comoMedir: 'Metros cravados, pelo boletim de cravação assinado' },
    { nome: 'Estrutura de concreto', unidade: 'm³', quantidadePrevista: 0, comoMedir: 'Volume concretado, pelas notas de concreto e pelo diário de obra' },
    { nome: 'Alvenaria', unidade: 'm²', quantidadePrevista: 0, comoMedir: 'Área levantada, descontados vãos acima de 2 m²' },
    { nome: 'Instalações hidrossanitárias', unidade: 'm', quantidadePrevista: 0, comoMedir: 'Metros de tubulação assentada e testada (teste de pressão registrado)' },
    { nome: 'Instalações elétricas', unidade: 'm', quantidadePrevista: 0, comoMedir: 'Metros de eletroduto com fiação passada e circuito testado' },
    { nome: 'Revestimentos', unidade: 'm²', quantidadePrevista: 0, comoMedir: 'Área revestida e aceita pela fiscalização' },
    { nome: 'Cobertura', unidade: 'm²', quantidadePrevista: 0, comoMedir: 'Área coberta, com teste de estanqueidade' },
    { nome: 'Pintura', unidade: 'm²', quantidadePrevista: 0, comoMedir: 'Área pintada na demão final' },
    { nome: 'Limpeza e entrega', unidade: 'vb', quantidadePrevista: 1, comoMedir: 'Verba: só na entrega, com termo de recebimento provisório' },
  ],
  'Saneamento (rede de água ou esgoto)': [
    { nome: 'Escavação de vala', unidade: 'm³', quantidadePrevista: 0, comoMedir: 'Volume escavado pela seção de projeto, não pela seção executada em excesso' },
    { nome: 'Assentamento de tubulação', unidade: 'm', quantidadePrevista: 0, comoMedir: 'Metros assentados, alinhados e com declividade conferida' },
    { nome: 'Teste de estanqueidade', unidade: 'm', quantidadePrevista: 0, comoMedir: 'Trecho aprovado no teste, com laudo (NBR 12266 para redes enterradas)' },
    { nome: 'Poços de visita', unidade: 'un', quantidadePrevista: 0, comoMedir: 'Poço concluído, com tampão assentado na cota' },
    { nome: 'Ligações domiciliares', unidade: 'un', quantidadePrevista: 0, comoMedir: 'Ligação executada e cadastrada' },
    { nome: 'Reaterro e compactação', unidade: 'm³', quantidadePrevista: 0, comoMedir: 'Volume reaterrado com grau de compactação aprovado em ensaio' },
    { nome: 'Recomposição de pavimento', unidade: 'm²', quantidadePrevista: 0, comoMedir: 'Área recomposta e liberada ao tráfego' },
  ],
  'Pavimentação': [
    { nome: 'Regularização do subleito', unidade: 'm²', quantidadePrevista: 0, comoMedir: 'Área regularizada, com cota e greide conferidos' },
    { nome: 'Base e sub-base', unidade: 'm³', quantidadePrevista: 0, comoMedir: 'Volume compactado, com ensaio de densidade por trecho' },
    { nome: 'Imprimação', unidade: 'm²', quantidadePrevista: 0, comoMedir: 'Área imprimada, pela taxa de ligante do projeto' },
    { nome: 'Revestimento asfáltico', unidade: 't', quantidadePrevista: 0, comoMedir: 'Toneladas aplicadas, pelos tíquetes de balança da usina' },
    { nome: 'Drenagem', unidade: 'm', quantidadePrevista: 0, comoMedir: 'Metros de galeria ou sarjeta concluídos' },
    { nome: 'Sinalização', unidade: 'm²', quantidadePrevista: 0, comoMedir: 'Área de pintura e placas instaladas' },
  ],
}

/** Valor contratado de um serviço, quando há preço. */
export const valorPrevisto = (i: Indicador): number | null =>
  i.precoUnitario === undefined ? null : r(i.quantidadePrevista * i.precoUnitario)

/**
 * Decide o peso de cada serviço no avanço da obra, e diz de onde tirou.
 *
 * Ordem: peso informado pelo cliente > peso pelo valor do serviço > peso igual para todos. O peso
 * informado só vale se vier em TODOS os serviços; metade informada seria uma régua torta, e o certo
 * nesse caso é ignorar a metade e avisar.
 */
export function pesos(indicadores: Indicador[]): { pesos: number[]; regra: Medicao['regraDoPeso']; avisos: string[] } {
  const avisos: string[] = []
  if (indicadores.length === 0) return { pesos: [], regra: 'peso igual para todos', avisos: ['Nenhum serviço na lista: nada a medir.'] }

  const informados = indicadores.filter(i => i.pesoPorcento !== undefined)
  if (informados.length === indicadores.length) {
    const soma = informados.reduce((s, i) => s + (i.pesoPorcento ?? 0), 0)
    if (Math.abs(soma - 100) > 0.5) {
      avisos.push(`Os pesos informados somam ${fmt(soma)}%, não 100%. A conta foi feita proporcionalmente, mas vale revisar a planilha.`)
    }
    if (soma <= 0) {
      avisos.push('Os pesos informados somam zero. Usei peso igual para todos.')
      return { pesos: indicadores.map(() => r(100 / indicadores.length, 4)), regra: 'peso igual para todos', avisos }
    }
    return { pesos: indicadores.map(i => r(((i.pesoPorcento ?? 0) / soma) * 100, 4)), regra: 'informado pelo cliente', avisos }
  }
  if (informados.length > 0) {
    avisos.push(`${informados.length} de ${indicadores.length} serviços têm peso informado à mão. Peso pela metade não serve de régua, então ignorei os informados e usei o valor de cada serviço.`)
  }

  const valores = indicadores.map(i => valorPrevisto(i) ?? 0)
  const total = valores.reduce((s, v) => s + v, 0)
  if (total > 0) {
    const semPreco = indicadores.filter(i => valorPrevisto(i) === null)
    if (semPreco.length) avisos.push(`${semPreco.length} serviço(s) sem preço entraram com peso zero no avanço: ${semPreco.map(i => i.nome).join(', ')}.`)
    return { pesos: valores.map(v => r((v / total) * 100, 4)), regra: 'pelo valor de cada serviço', avisos }
  }
  avisos.push('Nenhum serviço tem preço, então o avanço saiu com peso igual para todos. Informe preço ou peso para a porcentagem refletir o tamanho de cada serviço.')
  return { pesos: indicadores.map(() => r(100 / indicadores.length, 4)), regra: 'peso igual para todos', avisos }
}

/** Períodos AAAA-MM em ordem, como texto, sem depender de fuso. */
const anterior = (periodos: string[], atual: string) => periodos.filter(p => p < atual).sort().pop()

/**
 * Mede a obra num período. `lancamentos` traz a quantidade ACUMULADA de cada serviço em cada período;
 * a diferença com o período anterior é o que se paga agora.
 */
export function medirObra(indicadores: Indicador[], lancamentos: Lancamento[], periodo: string): Resultado<Medicao> {
  const p = pesos(indicadores)
  const avisos = [...p.avisos]
  const passos: Passo[] = []
  const periodos = [...new Set(lancamentos.map(l => l.periodo))]
  const antes = anterior(periodos, periodo)

  const acumulado = (id: string, per: string | undefined) =>
    per === undefined ? 0 : (lancamentos.find(l => l.indicadorId === id && l.periodo === per)?.quantidadeAcumulada ?? 0)

  const porIndicador: AvancoDoIndicador[] = indicadores.map((i, k) => {
    const agora = acumulado(i.id, periodo)
    const atras = acumulado(i.id, antes)
    const avanco = i.quantidadePrevista > 0 ? Math.min(100, r((agora / i.quantidadePrevista) * 100)) : null
    if (i.quantidadePrevista > 0 && agora > i.quantidadePrevista) {
      avisos.push(`"${i.nome}": medido ${fmt(agora)} ${i.unidade} contra ${fmt(i.quantidadePrevista)} ${i.unidade} previstos. Excesso não se mede sem aditivo assinado.`)
    }
    if (agora < atras) {
      avisos.push(`"${i.nome}": o acumulado caiu de ${fmt(atras)} para ${fmt(agora)} ${i.unidade}. Acumulado não desce; confira o lançamento.`)
    }
    const quantidadeDoPeriodo = r(Math.max(0, agora - atras))
    return {
      indicador: i,
      pesoPorcento: p.pesos[k],
      quantidadeAcumulada: r(agora),
      avancoPorcento: avanco,
      valorAcumulado: i.precoUnitario === undefined ? null : r(agora * i.precoUnitario),
      quantidadeDoPeriodo,
      valorDoPeriodo: i.precoUnitario === undefined ? null : r(quantidadeDoPeriodo * i.precoUnitario),
    }
  })

  const avancoFisico = r(porIndicador.reduce((s, a) => s + (a.pesoPorcento / 100) * (a.avancoPorcento ?? 0), 0))
  const comPreco = porIndicador.filter(a => a.valorAcumulado !== null)
  const valorAcumulado = comPreco.length ? r(comPreco.reduce((s, a) => s + (a.valorAcumulado ?? 0), 0)) : null
  const valorDoPeriodo = comPreco.length ? r(comPreco.reduce((s, a) => s + (a.valorDoPeriodo ?? 0), 0)) : null
  const previstos = indicadores.map(valorPrevisto).filter((v): v is number => v !== null)
  const valorDoContrato = previstos.length ? r(previstos.reduce((s, v) => s + v, 0)) : null

  passos.push({
    titulo: `Peso de cada serviço (${p.regra})`,
    formula: p.regra === 'pelo valor de cada serviço' ? 'peso_i = (quantidade_i × preço_i) ÷ valor do contrato' : 'peso_i informado, normalizado para somar 100%',
    conta: porIndicador.map(a => `${a.indicador.nome}: ${fmt(a.pesoPorcento)}%`).join('; '),
    resultado: r(porIndicador.reduce((s, a) => s + a.pesoPorcento, 0)),
    unidade: '%',
    referencia: 'planilha orçamentária do contrato',
  })
  passos.push({
    titulo: 'Avanço físico acumulado da obra',
    formula: 'avanço = Σ (peso_i ÷ 100) × avanço_i',
    conta: porIndicador.filter(a => a.avancoPorcento !== null).map(a => `${fmt(a.pesoPorcento)}% × ${fmt(a.avancoPorcento ?? 0)}%`).join(' + ') || '(nenhum serviço com quantidade prevista)',
    resultado: avancoFisico,
    unidade: '%',
  })
  if (valorDoPeriodo !== null) {
    passos.push({
      titulo: `Valor a medir no período ${periodo}`,
      formula: 'valor = Σ (acumulado agora − acumulado no período anterior) × preço_i',
      conta: antes ? `acumulados de ${periodo} menos os de ${antes}` : `primeira medição: acumulados de ${periodo}`,
      resultado: valorDoPeriodo,
      unidade: 'R$',
    })
  }
  if (valorDoContrato === null) {
    avisos.push('Sem preço unitário em nenhum serviço, a medição sai só em porcentagem. O valor a pagar depende dos preços do contrato.')
  }

  return {
    valores: { periodo, avancoFisicoPorcento: avancoFisico, valorAcumulado, valorDoPeriodo, valorDoContrato, porIndicador, regraDoPeso: p.regra },
    passos,
    avisos,
  }
}

/**
 * Compara o avanço medido com o avanço que o cronograma prometia (curva S do contrato).
 * Positivo quer dizer adiantado; negativo, atrasado.
 */
export function desvioDeAvanco(medido: number, previstoNoCronograma: number): Resultado<{ desvioPorcento: number; situacao: 'adiantada' | 'em dia' | 'atrasada' }> {
  const desvio = r(medido - previstoNoCronograma)
  const situacao = desvio > 1 ? 'adiantada' : desvio < -1 ? 'atrasada' : 'em dia'
  return {
    valores: { desvioPorcento: desvio, situacao },
    passos: [{
      titulo: 'Desvio de avanço contra o cronograma',
      formula: 'desvio = avanço medido − avanço previsto',
      conta: `${fmt(medido)}% − ${fmt(previstoNoCronograma)}%`,
      resultado: desvio,
      unidade: '%',
    }],
    avisos: situacao === 'atrasada'
      ? [`A obra está ${fmt(Math.abs(desvio))}% atrás do cronograma. Atraso medido não é atraso justificado: o motivo vai no diário de obra.`]
      : [],
  }
}

/** Boletim de medição em texto, para imprimir, assinar e arquivar. */
export function boletimDeMedicao(obra: string, cliente: string, m: Medicao, passos: Passo[], avisos: string[]): string {
  const linhas = [
    `BOLETIM DE MEDIÇÃO — ${obra}`,
    `Cliente: ${cliente}`,
    `Período: ${m.periodo}`,
    'THEYE Institute · plataforma de engenharia',
    '',
    'SERVIÇOS MEDIDOS',
  ]
  m.porIndicador.forEach((a, i) => {
    linhas.push(`${i + 1}. ${a.indicador.nome} (${a.indicador.unidade}) — peso ${fmt(a.pesoPorcento)}%`)
    linhas.push(`   Previsto: ${fmt(a.indicador.quantidadePrevista)}  ·  Acumulado: ${fmt(a.quantidadeAcumulada)}  ·  Neste período: ${fmt(a.quantidadeDoPeriodo)}`)
    if (a.avancoPorcento !== null) linhas.push(`   Avanço do serviço: ${fmt(a.avancoPorcento)}%`)
    if (a.valorDoPeriodo !== null) linhas.push(`   A pagar no período: ${dinheiro(a.valorDoPeriodo)}  ·  Acumulado: ${dinheiro(a.valorAcumulado ?? 0)}`)
    linhas.push(`   Como se mede: ${a.indicador.comoMedir}`)
  })
  linhas.push('', 'RESUMO')
  linhas.push(`  Avanço físico acumulado: ${fmt(m.avancoFisicoPorcento)}%`)
  if (m.valorDoPeriodo !== null) linhas.push(`  Valor a pagar neste período: ${dinheiro(m.valorDoPeriodo)}`)
  if (m.valorAcumulado !== null) linhas.push(`  Valor medido acumulado: ${dinheiro(m.valorAcumulado)}`)
  if (m.valorDoContrato !== null) linhas.push(`  Valor do contrato: ${dinheiro(m.valorDoContrato)}`)
  linhas.push(`  Régua dos pesos: ${m.regraDoPeso}`)
  linhas.push('', 'COMO ESTA CONTA FOI FEITA')
  passos.forEach((p, i) => {
    linhas.push(`${i + 1}. ${p.titulo}`)
    linhas.push(`   ${p.formula}`)
    linhas.push(`   ${p.conta} = ${fmt(p.resultado)} ${p.unidade}`.trimEnd())
    if (p.referencia) linhas.push(`   Referência: ${p.referencia}`)
  })
  if (avisos.length) {
    linhas.push('', 'ATENÇÃO')
    avisos.forEach(a => linhas.push(`  - ${a}`))
  }
  linhas.push('', AVISO_ENGENHARIA, '', 'Responsável técnico: ______________________  Crea: __________  ART: __________', 'Fiscalização: ______________________      Data: ____/____/______')
  return linhas.join('\n')
}
