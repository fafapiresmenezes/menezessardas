// Theye Suporte Jurídico — utilidades comuns das ferramentas do dia a dia (datas em UTC no formato AAAA-MM-DD, moeda).
import { diaUtil, feriados } from '@/lib/prazos'

export const DIA = 86400000
export const brl = (v: number) => (Number.isFinite(v) ? v : 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
export const pct = (v: number, casas = 2) => `${(Number.isFinite(v) ? v : 0).toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas })}%`
export const num = (s: unknown): number => {
  if (typeof s === 'number') return s
  const t = String(s ?? '').trim()
  if (!t) return NaN
  // aceita "1.234,56", "1234,56" e "1234.56"
  const normal = /,\d{1,}$/.test(t) || (t.includes(',') && t.includes('.')) ? t.replace(/\./g, '').replace(',', '.') : t
  return Number(normal)
}
export const arred = (v: number, casas = 2) => Math.round((v + Number.EPSILON) * 10 ** casas) / 10 ** casas

export function dataValida(iso: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false
  const d = new Date(`${iso}T00:00:00Z`)
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === iso
}
export const paraData = (iso: string) => new Date(`${iso}T00:00:00Z`)
export const iso = (d: Date) => d.toISOString().slice(0, 10)
export const somarDias = (dataIso: string, n: number) => iso(new Date(paraData(dataIso).getTime() + n * DIA))
export const diasEntre = (a: string, b: string) => Math.round((paraData(b).getTime() - paraData(a).getTime()) / DIA)
export function br(dataIso: string): string { const [a, m, d] = dataIso.split('-'); return `${d}/${m}/${a}` }

const SEMANA = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado']
export const diaDaSemana = (dataIso: string) => SEMANA[paraData(dataIso).getUTCDay()]

/** Soma meses ou anos "de data a data" (CC art. 132, § 3º): sem o dia correspondente, vale o dia seguinte (1º do mês seguinte). */
export function somarMeses(dataIso: string, meses: number): string {
  const d = paraData(dataIso)
  const ano = d.getUTCFullYear(), mes = d.getUTCMonth() + meses, dia = d.getUTCDate()
  const alvo = new Date(Date.UTC(ano, mes, 1))
  const ultimo = new Date(Date.UTC(alvo.getUTCFullYear(), alvo.getUTCMonth() + 1, 0)).getUTCDate()
  if (dia > ultimo) return iso(new Date(Date.UTC(alvo.getUTCFullYear(), alvo.getUTCMonth() + 1, 1)))
  return iso(new Date(Date.UTC(alvo.getUTCFullYear(), alvo.getUTCMonth(), dia)))
}
export const somarAnos = (dataIso: string, anos: number) => somarMeses(dataIso, anos * 12)

/** Dia sem expediente forense? (fim de semana ou feriado; não considera o recesso, que só suspende prazo processual). */
export function semExpediente(dataIso: string): string | null {
  const d = paraData(dataIso)
  const dow = d.getUTCDay()
  if (dow === 0 || dow === 6) return 'fim de semana'
  return feriados(d.getUTCFullYear()).get(dataIso) ?? null
}
/** Próximo dia com expediente, a partir da própria data (CC art. 132, § 1º). */
export function prorrogarParaDiaUtil(dataIso: string): string {
  let d = dataIso
  for (let i = 0; i < 30 && semExpediente(d); i++) d = somarDias(d, 1)
  return d
}
/** Primeiro dia útil processual estritamente depois da data (recesso conta como não útil — CPC art. 220). */
export function proximoDiaUtilProcessual(dataIso: string): string {
  let d = somarDias(dataIso, 1)
  for (let i = 0; i < 60 && diaUtil(paraData(d)); i++) d = somarDias(d, 1)
  return d
}
/** Conta dias úteis processuais depois de `inicio` (exclui o dia do começo — CPC art. 224). */
export function somarDiasUteis(inicio: string, n: number): string {
  let d = inicio, c = 0
  while (c < n) { d = somarDias(d, 1); if (!diaUtil(paraData(d))) c++ }
  return d
}
export function contarDiasUteis(de: string, ate: string): number {
  let c = 0
  for (let d = somarDias(de, 1); d <= ate; d = somarDias(d, 1)) if (!diaUtil(paraData(d))) c++
  return c
}
