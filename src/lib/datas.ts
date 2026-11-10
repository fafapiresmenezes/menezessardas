/**
 * Prazos são sempre calculados a partir de hoje. Datas fixas no código
 * envelhecem e passam a mentir — um contrato "a vencer" vira vencido
 * sem que ninguém mude nada.
 */

function hojeZerado() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

/** Data ISO (aaaa-mm-dd) daqui a N dias. Use para montar dados de exemplo. */
export function emDias(dias: number): string {
  const d = hojeZerado()
  d.setDate(d.getDate() + dias)
  return isoLocal(d)
}

/** Dias entre hoje e a data informada. Negativo quando já passou. */
export function diasAte(dataISO: string | null | undefined): number | null {
  if (!dataISO) return null
  const alvo = new Date(dataISO.slice(0, 10) + 'T00:00:00')
  if (Number.isNaN(alvo.getTime())) return null
  return Math.round((alvo.getTime() - hojeZerado().getTime()) / 86400000)
}

/** Data (aaaa-mm-dd) no fuso de quem usa: depois das 21h no Brasil o UTC já está no dia seguinte. */
export function isoLocal(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
/** Hoje (aaaa-mm-dd) no fuso local. Use no lugar de new Date().toISOString().slice(0, 10). */
export function hojeLocal(): string {
  return isoLocal(new Date())
}

/** aaaa-mm-dd → dd/mm/aaaa */
export function formatarData(dataISO: string | null | undefined): string {
  if (!dataISO) return '—'
  const [a, m, d] = dataISO.slice(0, 10).split('-')
  if (!a || !m || !d) return dataISO
  return `${d}/${m}/${a}`
}

export type Situacao = 'vencido' | 'critico' | 'atencao' | 'regular' | 'sem_prazo'

/** Vence hoje (0 dias) conta como crítico, nunca como regular. */
export function situacaoPorPrazo(dias: number | null): Situacao {
  if (dias === null) return 'sem_prazo'
  if (dias < 0) return 'vencido'
  if (dias <= 30) return 'critico'
  if (dias <= 120) return 'atencao'
  return 'regular'
}

export const rotuloSituacao: Record<Situacao, string> = {
  vencido: 'Vencido',
  critico: 'Crítico',
  atencao: 'Atenção',
  regular: 'Regular',
  sem_prazo: 'Sem prazo',
}

/** Texto do prazo em linguagem corrente, sem números negativos. */
export function textoPrazo(dias: number | null): string {
  if (dias === null) return 'Sem prazo definido'
  if (dias < 0) return `Vencido há ${Math.abs(dias)} ${Math.abs(dias) === 1 ? 'dia' : 'dias'}`
  if (dias === 0) return 'Vence hoje'
  if (dias === 1) return 'Vence amanhã'
  return `Vence em ${dias} dias`
}
