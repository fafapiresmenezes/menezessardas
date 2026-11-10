// Theye Suporte Jurídico — prazos e cálculos do dia a dia do advogado. Regras com base legal citada em cada função.
import { arred, contarDiasUteis, diasEntre, prorrogarParaDiaUtil, proximoDiaUtilProcessual, semExpediente, somarAnos, somarDias, somarDiasUteis, somarMeses } from './base'

// ---------- Prazos processuais ----------
export type AtoProcessual = { id: string; ato: string; dias: number; base: string; rito: 'CPC' | 'JEC' | 'CLT' }
export const ATOS: AtoProcessual[] = [
  { id: 'contestacao', ato: 'Contestação (procedimento comum)', dias: 15, base: 'CPC, art. 335', rito: 'CPC' },
  { id: 'replica', ato: 'Réplica', dias: 15, base: 'CPC, arts. 350 e 351', rito: 'CPC' },
  { id: 'emenda', ato: 'Emenda da petição inicial', dias: 15, base: 'CPC, art. 321', rito: 'CPC' },
  { id: 'apelacao', ato: 'Apelação', dias: 15, base: 'CPC, art. 1.003, § 5º', rito: 'CPC' },
  { id: 'contrarrazoes', ato: 'Contrarrazões de apelação', dias: 15, base: 'CPC, art. 1.010, § 1º', rito: 'CPC' },
  { id: 'agravo-instrumento', ato: 'Agravo de instrumento', dias: 15, base: 'CPC, art. 1.003, § 5º', rito: 'CPC' },
  { id: 'agravo-interno', ato: 'Agravo interno', dias: 15, base: 'CPC, art. 1.070', rito: 'CPC' },
  { id: 'embargos-declaracao', ato: 'Embargos de declaração', dias: 5, base: 'CPC, art. 1.023', rito: 'CPC' },
  { id: 'resp-re', ato: 'Recurso especial ou extraordinário', dias: 15, base: 'CPC, art. 1.003, § 5º', rito: 'CPC' },
  { id: 'pagamento-523', ato: 'Pagamento voluntário no cumprimento de sentença', dias: 15, base: 'CPC, art. 523', rito: 'CPC' },
  { id: 'impugnacao', ato: 'Impugnação ao cumprimento de sentença', dias: 15, base: 'CPC, art. 525', rito: 'CPC' },
  { id: 'embargos-execucao', ato: 'Embargos à execução', dias: 15, base: 'CPC, art. 915', rito: 'CPC' },
  { id: 'generico', ato: 'Manifestação sem prazo fixado', dias: 5, base: 'CPC, art. 218, § 3º', rito: 'CPC' },
  { id: 'recurso-inominado', ato: 'Recurso inominado (Juizado Especial)', dias: 10, base: 'Lei 9.099/95, arts. 12-A e 42', rito: 'JEC' },
  { id: 'ed-jec', ato: 'Embargos de declaração (Juizado Especial)', dias: 5, base: 'Lei 9.099/95, arts. 12-A e 49', rito: 'JEC' },
  { id: 'recurso-ordinario', ato: 'Recurso ordinário trabalhista', dias: 8, base: 'CLT, arts. 775 e 895', rito: 'CLT' },
  { id: 'ed-clt', ato: 'Embargos de declaração trabalhistas', dias: 5, base: 'CLT, arts. 775 e 897-A', rito: 'CLT' },
]
export const PRERROGATIVAS: Record<string, string> = {
  nenhuma: 'Sem prazo em dobro',
  fazenda: 'Fazenda Pública (CPC, art. 183)',
  mp: 'Ministério Público (CPC, art. 180)',
  defensoria: 'Defensoria Pública ou núcleo de prática jurídica (CPC, art. 186)',
  litisconsortes: 'Litisconsortes com advogados diferentes, autos físicos (CPC, art. 229)',
}

/** Prazo do ato contado a partir do dia em que a intimação se considera feita. */
export function prazoDoAto(atoId: string, intimacao: string, prerrogativa = 'nenhuma') {
  const ato = ATOS.find(a => a.id === atoId)
  if (!ato) throw new Error('Ato não encontrado')
  const dobro = prerrogativa !== 'nenhuma'
  const avisos: string[] = []
  if (dobro && ato.rito === 'JEC' && prerrogativa === 'fazenda') avisos.push('Nos Juizados da Fazenda Pública não há prazo diferenciado (Lei 12.153/2009, art. 7º).')
  if (dobro && ato.rito === 'CLT') avisos.push('Na Justiça do Trabalho, o prazo em dobro da Fazenda segue o Decreto-Lei 779/69; confira o caso concreto.')
  const dias = dobro ? ato.dias * 2 : ato.dias
  const inicio = proximoDiaUtilProcessual(intimacao)
  const final = somarDiasUteis(intimacao, dias)
  return { ato, dias, inicio, final, avisos }
}

/** DJEN (Lei 11.419/2006, art. 4º, §§ 3º e 4º; CPC, art. 224, § 2º): publicação é o 1º dia útil após a disponibilização; o prazo começa no dia útil seguinte. */
export function prazoDjen(disponibilizacao: string, dias: number) {
  const publicacao = proximoDiaUtilProcessual(disponibilizacao)
  const inicio = proximoDiaUtilProcessual(publicacao)
  const final = dias > 0 ? somarDiasUteis(publicacao, dias) : null
  return { publicacao, inicio, final }
}

/** Intimação pelo portal (Lei 11.419/2006, art. 5º, § 3º): sem consulta em 10 dias corridos do envio, considera-se feita no fim desse prazo. */
export function intimacaoTacita(envio: string, dias: number) {
  const decimoDia = somarDias(envio, 10)
  const tacita = prorrogarParaDiaUtil(decimoDia)
  const inicio = proximoDiaUtilProcessual(tacita)
  const final = dias > 0 ? somarDiasUteis(tacita, dias) : null
  return { decimoDia, tacita, prorrogada: tacita !== decimoDia, inicio, final }
}

/** Prazo em dias corridos (CC, art. 132): exclui o dia do começo, inclui o do vencimento; vencendo em feriado, prorroga-se. */
export function prazoCorrido(inicio: string, dias: number) {
  const vencimento = somarDias(inicio, dias)
  const final = prorrogarParaDiaUtil(vencimento)
  return { vencimento, final, motivo: semExpediente(vencimento) }
}

export function diferencaDatas(de: string, ate: string) {
  const corridos = diasEntre(de, ate)
  const [a, b] = corridos >= 0 ? [de, ate] : [ate, de]
  let anos = 0, meses = 0
  while (somarAnos(a, anos + 1) <= b) anos++
  while (somarMeses(a, anos * 12 + meses + 1) <= b) meses++
  const dias = diasEntre(somarMeses(a, anos * 12 + meses), b)
  return { corridos: Math.abs(corridos), uteis: contarDiasUteis(a, b), semanas: Math.floor(Math.abs(corridos) / 7), anos, meses, dias }
}

// ---------- Prescrição e decadência ----------
export type HipotesePrescricao = { id: string; nome: string; quantidade: number; unidade: 'anos' | 'meses' | 'dias'; base: string; natureza: 'prescrição' | 'decadência' }
export const PRESCRICOES: HipotesePrescricao[] = [
  { id: 'geral', nome: 'Regra geral (sem prazo específico)', quantidade: 10, unidade: 'anos', base: 'CC, art. 205', natureza: 'prescrição' },
  { id: 'alugueis', nome: 'Cobrança de aluguéis', quantidade: 3, unidade: 'anos', base: 'CC, art. 206, § 3º, I', natureza: 'prescrição' },
  { id: 'reparacao', nome: 'Reparação civil (danos)', quantidade: 3, unidade: 'anos', base: 'CC, art. 206, § 3º, V', natureza: 'prescrição' },
  { id: 'enriquecimento', nome: 'Enriquecimento sem causa', quantidade: 3, unidade: 'anos', base: 'CC, art. 206, § 3º, IV', natureza: 'prescrição' },
  { id: 'divida-liquida', nome: 'Dívida líquida em instrumento público ou particular', quantidade: 5, unidade: 'anos', base: 'CC, art. 206, § 5º, I', natureza: 'prescrição' },
  { id: 'honorarios', nome: 'Honorários de profissional liberal (advogado)', quantidade: 5, unidade: 'anos', base: 'CC, art. 206, § 5º, II', natureza: 'prescrição' },
  { id: 'seguro', nome: 'Segurado contra segurador', quantidade: 1, unidade: 'anos', base: 'CC, art. 206, § 1º, II', natureza: 'prescrição' },
  { id: 'cdc-fato', nome: 'Consumidor: fato do produto ou serviço (acidente de consumo)', quantidade: 5, unidade: 'anos', base: 'CDC, art. 27', natureza: 'prescrição' },
  { id: 'fazenda', nome: 'Contra a Fazenda Pública', quantidade: 5, unidade: 'anos', base: 'Decreto 20.910/1932, art. 1º', natureza: 'prescrição' },
  { id: 'trabalhista', nome: 'Trabalhista: ajuizar após o fim do contrato', quantidade: 2, unidade: 'anos', base: 'CF, art. 7º, XXIX', natureza: 'prescrição' },
  { id: 'nota-promissoria', nome: 'Nota promissória contra o emitente', quantidade: 3, unidade: 'anos', base: 'Decreto 57.663/1966 (LUG), art. 70', natureza: 'prescrição' },
  { id: 'cheque', nome: 'Execução de cheque (após o fim do prazo de apresentação)', quantidade: 6, unidade: 'meses', base: 'Lei 7.357/1985, art. 59', natureza: 'prescrição' },
  { id: 'cdc-30', nome: 'Consumidor: vício aparente, produto/serviço não durável', quantidade: 30, unidade: 'dias', base: 'CDC, art. 26, I', natureza: 'decadência' },
  { id: 'cdc-90', nome: 'Consumidor: vício aparente, produto/serviço durável', quantidade: 90, unidade: 'dias', base: 'CDC, art. 26, II', natureza: 'decadência' },
]
export function calcularPrescricao(id: string, marco: string) {
  const h = PRESCRICOES.find(p => p.id === id)
  if (!h) throw new Error('Hipótese não encontrada')
  const termo = h.unidade === 'anos' ? somarAnos(marco, h.quantidade) : h.unidade === 'meses' ? somarMeses(marco, h.quantidade) : somarDias(marco, h.quantidade)
  const util = prorrogarParaDiaUtil(termo)
  return { hipotese: h, termo, ultimoDiaUtil: util, motivo: semExpediente(termo) }
}

// ---------- Juros, multa e cumprimento de sentença ----------
export function jurosEMulta(valor: number, vencimento: string, calculo: string, taxaMensal: number, multaPct: number, composto = false) {
  const dias = Math.max(0, diasEntre(vencimento, calculo))
  const t = taxaMensal / 100
  const juros = composto ? valor * ((1 + t) ** (dias / 30) - 1) : valor * t * (dias / 30)
  const multa = dias > 0 ? valor * multaPct / 100 : 0
  return { dias, juros: arred(juros), multa: arred(multa), total: arred(valor + juros + multa) }
}

/** CPC, art. 523, §§ 1º e 2º: sem pagamento em 15 dias, multa de 10% e honorários de 10% sobre o que restar. */
export function multa523(debito: number, pagoParcial = 0) {
  const restante = Math.max(0, debito - pagoParcial)
  const multa = arred(restante * 0.1), honorarios = arred(restante * 0.1)
  return { restante: arred(restante), multa, honorarios, total: arred(restante + multa + honorarios) }
}

/** CPC, art. 85, § 2º (entre 10% e 20%) e § 3º/§ 5º (Fazenda Pública, faixas escalonadas em salários mínimos). */
export const FAIXAS_FAZENDA: [number, number, number][] = [[200, 10, 20], [2000, 8, 10], [20000, 5, 8], [100000, 3, 5], [Infinity, 1, 3]]
export function honorariosSucumbencia(base: number, salarioMinimo: number, fazenda: boolean) {
  if (!fazenda) return { minimo: arred(base * 0.1), medio: arred(base * 0.15), maximo: arred(base * 0.2), faixas: [] as { faixa: string; valor: number; min: number; max: number }[] }
  const emSm = base / salarioMinimo
  let anterior = 0, min = 0, max = 0
  const faixas: { faixa: string; valor: number; min: number; max: number }[] = []
  for (const [teto, pMin, pMax] of FAIXAS_FAZENDA) {
    if (emSm <= anterior) break
    const parte = (Math.min(emSm, teto) - anterior) * salarioMinimo
    faixas.push({ faixa: `${anterior} a ${teto === Infinity ? 'acima' : teto} SM (${pMin}% a ${pMax}%)`, valor: arred(parte), min: arred(parte * pMin / 100), max: arred(parte * pMax / 100) })
    min += parte * pMin / 100; max += parte * pMax / 100
    anterior = teto
  }
  return { minimo: arred(min), medio: arred((min + max) / 2), maximo: arred(max), faixas }
}

export function pensaoAlimenticia(base: number, percentual: number, filhos: number, incide13 = true) {
  const mensal = arred(base * percentual / 100)
  return { mensal, porFilho: arred(mensal / Math.max(1, filhos)), decimoTerceiro: incide13 ? mensal : 0, anual: arred(mensal * (incide13 ? 13 : 12)) }
}

/** Lei 12.506/2011: 30 dias + 3 por ano completo de serviço, até 90 (Nota Técnica MTE 184/2012). */
export function avisoPrevio(admissao: string, comunicacao: string) {
  let anos = 0
  while (somarAnos(admissao, anos + 1) <= comunicacao) anos++
  const dias = 30 + 3 * Math.min(20, anos)
  return { anos, dias, termino: somarDias(comunicacao, dias) }
}
