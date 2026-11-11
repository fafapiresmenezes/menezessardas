// Números digitados do jeito brasileiro: "1.234,56", "R$ 1.500", "1234.56", "0,5". Devolve NaN quando não há número.
export function lerNumero(entrada: string | number | null | undefined): number {
  if (typeof entrada === 'number') return entrada
  let s = String(entrada ?? '').trim().replace(/[R$\s]/g, '')
  if (!s || !/\d/.test(s)) return NaN
  const neg = s.startsWith('-')
  s = s.replace(/[^\d.,]/g, '')
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.')
  else if ((s.match(/\./g) ?? []).length > 1 || /^\d{1,3}\.\d{3}$/.test(s)) s = s.replace(/\./g, '')
  const n = Number(s)
  return Number.isFinite(n) ? (neg ? -n : n) : NaN
}

/** Horas como "1,5", "1.5", "1:30" ou "1h30" → horas decimais. */
export function lerHoras(entrada: string | null | undefined): number {
  const s = String(entrada ?? '').trim().toLowerCase()
  const m = s.match(/^(\d{1,3})\s*(?::|h)\s*(\d{1,2})?\s*(?:min|m)?$/)
  if (m) return Number(m[1]) + Number(m[2] ?? 0) / 60
  return lerNumero(s)
}
