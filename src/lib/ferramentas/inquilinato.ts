// Theye Suporte Jurídico — ferramentas da Lei do Inquilinato (Lei 8.245/1991), tema central do Instituto THEYE.
import { arred, diasEntre, paraData, somarMeses } from './base'

/** Art. 58, III: valor da causa = 12 meses de aluguel; no despejo do art. 47, II, três salários vigentes. */
export function valorCausaLocaticia(aluguel: number, despejoEmpregado = false, salario = 0) {
  return despejoEmpregado ? { valor: arred(salario * 3), base: 'Lei 8.245/91, art. 58, III (3 salários vigentes, art. 47, II)' } : { valor: arred(aluguel * 12), base: 'Lei 8.245/91, art. 58, III (12 meses de aluguel)' }
}

/** Art. 4º: multa pactuada, proporcional ao período de cumprimento do contrato. */
export function multaRescisoria(multaTotal: number, prazoMeses: number, mesesCumpridos: number) {
  if (prazoMeses <= 0) throw new Error('Informe o prazo do contrato em meses')
  const restantes = Math.max(0, prazoMeses - mesesCumpridos)
  return { restantes, proporcional: arred(multaTotal * restantes / prazoMeses) }
}

const diasNoMes = (dataIso: string) => { const d = paraData(dataIso); return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate() }
/** Aluguel proporcional (pro rata die) no mês de entrada (da data até o fim do mês) ou de saída (do dia 1º até a data). */
export function aluguelProporcional(aluguel: number, data: string, modo: 'entrada' | 'saida') {
  const total = diasNoMes(data), dia = paraData(data).getUTCDate()
  const dias = modo === 'entrada' ? total - dia + 1 : dia
  return { dias, diasNoMes: total, valor: arred(aluguel * dias / total) }
}

/** Rateio de encargo anual (IPTU, seguro) pelos dias de ocupação, inclusive o primeiro e o último. */
export function rateioAnual(valorAnual: number, de: string, ate: string) {
  const ano = paraData(de).getUTCFullYear()
  const diasAno = (ano % 4 === 0 && ano % 100 !== 0) || ano % 400 === 0 ? 366 : 365
  const dias = diasEntre(de, ate) + 1
  if (dias <= 0) throw new Error('A data final deve ser depois da inicial')
  return { dias, diasAno, valor: arred(valorAnual * dias / diasAno) }
}

/** Art. 62, II: purgação da mora — aluguéis e acessórios vencidos, multas, juros, custas e honorários (10% se o contrato não disser). */
export function purgacaoMora(linhas: { vencimento: string; valor: number }[], pagamento: string, multaPct: number, jurosMensal: number, honorariosPct: number, custas: number) {
  const itens = linhas.map(l => {
    const dias = Math.max(0, diasEntre(l.vencimento, pagamento))
    const multa = dias > 0 ? l.valor * multaPct / 100 : 0
    const juros = l.valor * jurosMensal / 100 * dias / 30
    return { ...l, dias, multa: arred(multa), juros: arred(juros), subtotal: arred(l.valor + multa + juros) }
  })
  const principal = arred(itens.reduce((s, i) => s + i.subtotal, 0))
  const honorarios = arred(principal * honorariosPct / 100)
  return { itens, principal, honorarios, custas: arred(custas), total: arred(principal + honorarios + custas) }
}

/** Art. 51: renovatória — contrato escrito, por prazo determinado, 5 anos (ou soma ininterrupta), 3 anos no mesmo ramo; ajuizar entre 1 ano e 6 meses antes do fim (§ 5º). */
export function janelaRenovatoria(termino: string, prazoAnos: number, anosMesmoRamo: number, escrito: boolean) {
  const requisitos = [
    { ok: escrito, texto: 'Contrato escrito e por prazo determinado (art. 51, I)' },
    { ok: prazoAnos >= 5, texto: `Prazo mínimo de 5 anos, ou soma ininterrupta dos contratos escritos (art. 51, II) — informado: ${prazoAnos} ano(s)` },
    { ok: anosMesmoRamo >= 3, texto: `Mesmo ramo de atividade há 3 anos ininterruptos (art. 51, III) — informado: ${anosMesmoRamo} ano(s)` },
  ]
  return { abre: somarMeses(termino, -12), fecha: somarMeses(termino, -6), requisitos, cabivel: requisitos.every(r => r.ok) }
}

export const MODALIDADES_GARANTIA: Record<string, string> = { caucao: 'Caução', fianca: 'Fiança', seguro: 'Seguro de fiança locatícia', cessao: 'Cessão fiduciária de quotas de fundo de investimento' }
/** Arts. 37, 38 e 43: uma só modalidade de garantia; caução em dinheiro até 3 aluguéis, depositada em poupança. */
export function verificarGarantia(modalidades: string[], aluguel: number, caucaoDinheiro: number) {
  const alertas: string[] = []
  if (modalidades.length === 0) alertas.push('Sem garantia: o locador pode exigir o aluguel antecipado até o 6º dia do mês vincendo (art. 42) e cabe liminar no despejo (art. 59, § 1º, IX).')
  if (modalidades.length > 1) alertas.push('Mais de uma modalidade de garantia no mesmo contrato é vedada (art. 37, parágrafo único) e configura contravenção penal (art. 43, II).')
  if (modalidades.includes('caucao') && caucaoDinheiro > aluguel * 3) alertas.push(`Caução em dinheiro acima de 3 aluguéis (${(caucaoDinheiro / aluguel).toFixed(1)}x) é vedada (art. 38, § 2º).`)
  if (modalidades.includes('caucao') && caucaoDinheiro > 0) alertas.push('A caução em dinheiro deve ser depositada em caderneta de poupança, revertendo os rendimentos ao locatário (art. 38, § 2º).')
  return { regular: !alertas.some(a => /vedada|Sem garantia/.test(a)), alertas, limiteCaucao: arred(aluguel * 3) }
}
