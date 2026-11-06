// Passo D10 (Diamante): relatório por cliente e por sócio (responsável), a partir de horas lançadas e honorários dos casos.
export interface HoraLancada { usuario_id: string | null; cliente: string; minutos: number; valor_hora: number | string; faturavel: boolean }
export interface CasoHonorario { cliente: string | null; responsavel_id: string | null; honorario_previsto: number | string | null; honorario_recebido: number | string | null }
export interface PessoaNome { id: string; nome: string; email?: string }
export interface LinhaCliente { cliente: string; horas: number; custoHoras: number; combinado: number; recebido: number; rentabilidade: number }
export interface LinhaSocio { id: string; nome: string; horas: number; pctFaturavel: number; aFaturar: number; combinado: number; recebido: number }

const num = (v: unknown) => { const n = Number(v); return Number.isFinite(n) ? n : 0 }
const r2 = (n: number) => Math.round(n * 100) / 100

export function porCliente(horas: HoraLancada[], casos: CasoHonorario[]): LinhaCliente[] {
  const m = new Map<string, LinhaCliente>()
  const pega = (c: string) => { const k = (c || 'Sem cliente').trim() || 'Sem cliente'; if (!m.has(k)) m.set(k, { cliente: k, horas: 0, custoHoras: 0, combinado: 0, recebido: 0, rentabilidade: 0 }); return m.get(k)! }
  for (const h of horas) { const l = pega(h.cliente); l.horas += num(h.minutos) / 60; l.custoHoras += (num(h.minutos) / 60) * num(h.valor_hora) }
  for (const c of casos) { const l = pega(c.cliente ?? ''); l.combinado += num(c.honorario_previsto); l.recebido += num(c.honorario_recebido) }
  return [...m.values()].map(l => ({ ...l, horas: r2(l.horas), custoHoras: r2(l.custoHoras), combinado: r2(l.combinado), recebido: r2(l.recebido), rentabilidade: r2(l.recebido - l.custoHoras) })).sort((a, b) => b.rentabilidade - a.rentabilidade || a.cliente.localeCompare(b.cliente))
}

export function porSocio(horas: HoraLancada[], casos: CasoHonorario[], pessoas: PessoaNome[]): LinhaSocio[] {
  const nome = (id: string | null) => { if (!id) return 'Sem responsável'; const p = pessoas.find(x => x.id === id); return p ? (p.nome || p.email || id) : 'Pessoa fora da equipe' }
  const m = new Map<string, LinhaSocio & { minFat: number; minTot: number }>()
  const pega = (id: string | null) => { const k = id ?? 'sem'; if (!m.has(k)) m.set(k, { id: k, nome: nome(id), horas: 0, pctFaturavel: 0, aFaturar: 0, combinado: 0, recebido: 0, minFat: 0, minTot: 0 }); return m.get(k)! }
  for (const h of horas) { const l = pega(h.usuario_id); const min = num(h.minutos); l.minTot += min; if (h.faturavel) { l.minFat += min; l.aFaturar += (min / 60) * num(h.valor_hora) } }
  for (const c of casos) { const l = pega(c.responsavel_id); l.combinado += num(c.honorario_previsto); l.recebido += num(c.honorario_recebido) }
  return [...m.values()].map(({ minFat, minTot, ...l }) => ({ ...l, horas: r2(minTot / 60), pctFaturavel: minTot ? Math.round((minFat / minTot) * 100) : 0, aFaturar: r2(l.aFaturar), combinado: r2(l.combinado), recebido: r2(l.recebido) })).sort((a, b) => b.recebido - a.recebido || b.horas - a.horas)
}

export function csvClientesSocios(cl: LinhaCliente[], so: LinhaSocio[]): string {
  const f = (n: number) => n.toFixed(2).replace('.', ',')
  return ['cliente;horas;custo das horas;combinado;recebido;rentabilidade', ...cl.map(l => [l.cliente, f(l.horas), f(l.custoHoras), f(l.combinado), f(l.recebido), f(l.rentabilidade)].join(';')), '', 'responsável;horas;% faturável;a faturar;combinado;recebido', ...so.map(l => [l.nome, f(l.horas), String(l.pctFaturavel), f(l.aFaturar), f(l.combinado), f(l.recebido)].join(';'))].join('\n')
}
