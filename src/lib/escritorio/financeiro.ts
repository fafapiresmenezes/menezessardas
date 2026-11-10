// Financeiro do escritório: receitas (honorários pagos, parcelas, outras entradas) e despesas, com fluxo de caixa,
// contas a receber por atraso, contas a pagar, previsão de 90 dias, resultado por área e ponto de equilíbrio.
export type Lancamento = { id: string; tipo: 'receita' | 'despesa'; categoria: string; descricao: string; valor: number; vencimento: string; pago_em: string | null; caso_id: string | null; cliente: string | null; reembolsavel: boolean }
export type PagamentoHonorario = { id: number; caso_id: string; data: string; valor: number }
export type ParcelaHonorario = { id: number; caso_id: string; numero: number; vencimento: string; valor: number; pago_em: string | null }
export type CasoFin = { id: string; titulo: string; cliente: string | null; area: string | null; honorario_previsto: number; honorario_recebido: number; vencimento_honorario: string | null }

export const CATEGORIAS_DESPESA = ['Aluguel e condomínio', 'Folha e pró-labore', 'Impostos e taxas', 'Custas processuais', 'Diligências e correspondentes', 'Software e assinaturas', 'Marketing', 'OAB e anuidades', 'Contabilidade', 'Energia, internet e telefone', 'Material de escritório', 'Deslocamento', 'Outras despesas']
export const CATEGORIAS_RECEITA = ['Honorários contratuais', 'Honorários de êxito', 'Sucumbência', 'Partido mensal (consultoria)', 'Reembolso de despesas', 'Outras receitas']

const dia = (s: string) => s.slice(0, 10)
const mes = (s: string) => s.slice(0, 7)
const arred = (n: number) => Math.round(n * 100) / 100
const diasEntre = (a: string, b: string) => Math.round((Date.parse(`${b}T12:00:00Z`) - Date.parse(`${a}T12:00:00Z`)) / 86400000)

/** Soma meses preservando o dia (31/01 + 1 mês = 28 ou 29/02). */
export function somarMeses(iso: string, n: number): string {
  const [a, m, d] = iso.split('-').map(Number)
  const alvo = new Date(Date.UTC(a, m - 1 + n, 1))
  const ultimo = new Date(Date.UTC(alvo.getUTCFullYear(), alvo.getUTCMonth() + 1, 0)).getUTCDate()
  alvo.setUTCDate(Math.min(d, ultimo))
  return alvo.toISOString().slice(0, 10)
}

export function mesesAte(inicio: string, quantidade: number): string[] {
  return Array.from({ length: quantidade }, (_, i) => somarMeses(`${mes(inicio)}-01`, i).slice(0, 7))
}

/** Entradas realizadas: pagamentos de honorários + receitas lançadas e pagas. Saídas: despesas pagas. */
export function movimentos(l: Lancamento[], pg: PagamentoHonorario[]) {
  const entradas = [
    ...pg.map(p => ({ data: dia(p.data), valor: Number(p.valor), origem: 'Honorários', caso_id: p.caso_id as string | null })),
    ...l.filter(x => x.tipo === 'receita' && x.pago_em).map(x => ({ data: dia(x.pago_em!), valor: Number(x.valor), origem: x.categoria, caso_id: x.caso_id })),
  ]
  const saidas = l.filter(x => x.tipo === 'despesa' && x.pago_em).map(x => ({ data: dia(x.pago_em!), valor: Number(x.valor), origem: x.categoria, caso_id: x.caso_id }))
  return { entradas, saidas }
}

export function fluxoMensal(l: Lancamento[], pg: PagamentoHonorario[], parcelas: ParcelaHonorario[], meses: string[]) {
  const { entradas, saidas } = movimentos(l, pg)
  let acumulado = 0
  return meses.map(m => {
    const recebido = arred(entradas.filter(e => mes(e.data) === m).reduce((s, e) => s + e.valor, 0))
    const pago = arred(saidas.filter(e => mes(e.data) === m).reduce((s, e) => s + e.valor, 0))
    const aReceber = arred(parcelas.filter(p => !p.pago_em && mes(p.vencimento) === m).reduce((s, p) => s + Number(p.valor), 0)
      + l.filter(x => x.tipo === 'receita' && !x.pago_em && mes(x.vencimento) === m).reduce((s, x) => s + Number(x.valor), 0))
    const aPagar = arred(l.filter(x => x.tipo === 'despesa' && !x.pago_em && mes(x.vencimento) === m).reduce((s, x) => s + Number(x.valor), 0))
    acumulado = arred(acumulado + recebido - pago)
    return { mes: m, recebido, pago, resultado: arred(recebido - pago), acumulado, aReceber, aPagar }
  })
}

export type Recebivel = { origem: 'parcela' | 'lancamento' | 'honorario'; descricao: string; cliente: string | null; vencimento: string; valor: number; atraso: number; caso_id: string | null }

/** Tudo que o escritório tem a receber e ainda não recebeu (parcelas, receitas lançadas, honorário sem parcelas). */
export function recebiveis(l: Lancamento[], parcelas: ParcelaHonorario[], casos: CasoFin[], hoje: string): Recebivel[] {
  const caso = new Map(casos.map(c => [c.id, c]))
  const comParcelas = new Set(parcelas.map(p => p.caso_id))
  const out: Recebivel[] = []
  for (const p of parcelas) if (!p.pago_em) { const c = caso.get(p.caso_id); out.push({ origem: 'parcela', descricao: `${c?.titulo ?? 'Caso'} · parcela ${p.numero}`, cliente: c?.cliente ?? null, vencimento: dia(p.vencimento), valor: Number(p.valor), atraso: Math.max(0, diasEntre(dia(p.vencimento), hoje)), caso_id: p.caso_id }) }
  for (const x of l) if (x.tipo === 'receita' && !x.pago_em) out.push({ origem: 'lancamento', descricao: x.descricao, cliente: x.cliente, vencimento: dia(x.vencimento), valor: Number(x.valor), atraso: Math.max(0, diasEntre(dia(x.vencimento), hoje)), caso_id: x.caso_id })
  for (const c of casos) {
    const aberto = arred(Number(c.honorario_previsto) - Number(c.honorario_recebido))
    if (aberto > 0 && !comParcelas.has(c.id) && c.vencimento_honorario) out.push({ origem: 'honorario', descricao: `${c.titulo} · honorários`, cliente: c.cliente, vencimento: dia(c.vencimento_honorario), valor: aberto, atraso: Math.max(0, diasEntre(dia(c.vencimento_honorario), hoje)), caso_id: c.id })
  }
  return out.sort((a, b) => b.atraso - a.atraso || (a.vencimento < b.vencimento ? -1 : 1))
}

export const FAIXAS = ['A vencer', '1 a 30 dias', '31 a 60 dias', '61 a 90 dias', 'Mais de 90 dias'] as const
export function faixaAtraso(atraso: number, vencimento: string, hoje: string): (typeof FAIXAS)[number] {
  if (vencimento >= hoje) return 'A vencer'
  if (atraso <= 30) return '1 a 30 dias'
  if (atraso <= 60) return '31 a 60 dias'
  if (atraso <= 90) return '61 a 90 dias'
  return 'Mais de 90 dias'
}
export function aging(r: Recebivel[], hoje: string) {
  const faixas = FAIXAS.map(f => ({ faixa: f, quantidade: 0, valor: 0 }))
  for (const x of r) { const f = faixas.find(y => y.faixa === faixaAtraso(x.atraso, x.vencimento, hoje))!; f.quantidade++; f.valor = arred(f.valor + x.valor) }
  const total = arred(r.reduce((s, x) => s + x.valor, 0))
  const vencido = arred(r.filter(x => x.vencimento < hoje).reduce((s, x) => s + x.valor, 0))
  return { faixas, total, vencido, inadimplencia: total ? vencido / total : 0 }
}

export function contasAPagar(l: Lancamento[], hoje: string) {
  const abertas = l.filter(x => x.tipo === 'despesa' && !x.pago_em).sort((a, b) => (a.vencimento < b.vencimento ? -1 : 1))
  const soma = (xs: Lancamento[]) => arred(xs.reduce((s, x) => s + Number(x.valor), 0))
  const vencidas = abertas.filter(x => dia(x.vencimento) < hoje)
  const semana = abertas.filter(x => dia(x.vencimento) >= hoje && diasEntre(hoje, dia(x.vencimento)) <= 7)
  const mesQueVem = abertas.filter(x => dia(x.vencimento) >= hoje && diasEntre(hoje, dia(x.vencimento)) <= 30)
  return { abertas, vencidas, semana, mes: mesQueVem, totalVencido: soma(vencidas), totalSemana: soma(semana), total30: soma(mesQueVem) }
}

/** Previsão de caixa em 3 janelas de 30 dias, a partir do saldo informado. */
export function previsao90(l: Lancamento[], r: Recebivel[], hoje: string, saldoInicial = 0) {
  const janelas = [[0, 30], [31, 60], [61, 90]] as const
  let saldo = saldoInicial
  return janelas.map(([a, b]) => {
    const dentro = (v: string) => { const d = diasEntre(hoje, v); return a === 0 ? d <= b : d >= a && d <= b }
    // Atrasados entram na primeira janela, com 50% de chance (estimativa conservadora).
    const entra = arred(r.filter(x => dentro(x.vencimento) && x.vencimento >= hoje).reduce((s, x) => s + x.valor, 0) + (a === 0 ? r.filter(x => x.vencimento < hoje).reduce((s, x) => s + x.valor * 0.5, 0) : 0))
    const sai = arred(l.filter(x => x.tipo === 'despesa' && !x.pago_em && (dentro(dia(x.vencimento)) || (a === 0 && dia(x.vencimento) < hoje))).reduce((s, x) => s + Number(x.valor), 0))
    saldo = arred(saldo + entra - sai)
    return { janela: `${a === 0 ? 'Próximos' : `De ${a} a`} ${b} dias`, entra, sai, saldo }
  })
}

export function resultadoPorArea(l: Lancamento[], pg: PagamentoHonorario[], casos: CasoFin[], desde: string) {
  const area = new Map(casos.map(c => [c.id, c.area || 'Sem área']))
  const { entradas, saidas } = movimentos(l, pg)
  const m = new Map<string, { receita: number; despesa: number }>()
  const add = (k: string, campo: 'receita' | 'despesa', v: number) => { const x = m.get(k) ?? { receita: 0, despesa: 0 }; x[campo] = arred(x[campo] + v); m.set(k, x) }
  for (const e of entradas) if (e.data >= desde) add(e.caso_id ? area.get(e.caso_id) ?? 'Sem área' : 'Sem caso ligado', 'receita', e.valor)
  for (const s of saidas) if (s.data >= desde && s.caso_id) add(area.get(s.caso_id) ?? 'Sem área', 'despesa', s.valor)
  return [...m.entries()].map(([nome, v]) => ({ area: nome, ...v, margem: v.receita ? (v.receita - v.despesa) / v.receita : null })).sort((a, b) => b.receita - a.receita)
}

export function despesasPorCategoria(l: Lancamento[], desde: string) {
  const m = new Map<string, number>()
  for (const x of l) if (x.tipo === 'despesa' && x.pago_em && dia(x.pago_em) >= desde) m.set(x.categoria, arred((m.get(x.categoria) ?? 0) + Number(x.valor)))
  const total = arred([...m.values()].reduce((a, b) => a + b, 0))
  return [...m.entries()].map(([categoria, valor]) => ({ categoria, valor, parte: total ? valor / total : 0 })).sort((a, b) => b.valor - a.valor)
}

/** Ponto de equilíbrio: despesa média mensal dos últimos meses fechados e quanto falta receber no mês atual. */
export function pontoEquilibrio(l: Lancamento[], pg: PagamentoHonorario[], hoje: string, meses = 3) {
  const atual = mes(hoje)
  const anteriores = Array.from({ length: meses }, (_, i) => somarMeses(`${atual}-01`, -(i + 1)).slice(0, 7))
  const { entradas, saidas } = movimentos(l, pg)
  const media = arred(anteriores.reduce((s, m) => s + saidas.filter(x => mes(x.data) === m).reduce((a, x) => a + x.valor, 0), 0) / meses)
  const recebidoMes = arred(entradas.filter(x => mes(x.data) === atual).reduce((s, x) => s + x.valor, 0))
  return { despesaMedia: media, recebidoMes, falta: arred(Math.max(0, media - recebidoMes)), atingido: media > 0 && recebidoMes >= media }
}

export function reembolsosPendentes(l: Lancamento[]) {
  const receitasReembolso = l.filter(x => x.tipo === 'receita' && x.categoria === 'Reembolso de despesas')
  const m = new Map<string, { gasto: number; reembolsado: number }>()
  for (const x of l) if (x.tipo === 'despesa' && x.reembolsavel) { const k = x.cliente || 'Sem cliente'; const v = m.get(k) ?? { gasto: 0, reembolsado: 0 }; v.gasto = arred(v.gasto + Number(x.valor)); m.set(k, v) }
  for (const x of receitasReembolso) { const k = x.cliente || 'Sem cliente'; const v = m.get(k); if (v && x.pago_em) v.reembolsado = arred(v.reembolsado + Number(x.valor)) }
  return [...m.entries()].map(([cliente, v]) => ({ cliente, ...v, pendente: arred(Math.max(0, v.gasto - v.reembolsado)) })).filter(x => x.pendente > 0).sort((a, b) => b.pendente - a.pendente)
}

/** Lançamento repetido todo mês (aluguel, assinatura, partido mensal). */
export function repetirMensal<T extends { vencimento: string; descricao: string }>(base: T, vezes: number): T[] {
  const n = Math.max(1, Math.min(60, Math.floor(vezes)))
  return Array.from({ length: n }, (_, i) => ({ ...base, vencimento: somarMeses(base.vencimento, i), descricao: n > 1 ? `${base.descricao} (${i + 1}/${n})` : base.descricao }))
}
